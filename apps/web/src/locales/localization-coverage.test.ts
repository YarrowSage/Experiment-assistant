import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";

const sourceRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("localization coverage", () => {
  it("keeps zh-CN and en-US catalogs in exact key parity", () => {
    expect(Object.keys(zhCN).sort()).toEqual(Object.keys(enUS).sort());
  });

  it("does not allow hard-coded visible text in production JSX", () => {
    const violations = sourceFiles(".tsx")
      .filter((file) => !file.includes(".test."))
      .flatMap(findVisibleJsxLiterals);

    expect(violations).toEqual([]);
  });

  it("does not allow hard-coded page metadata copy", () => {
    const violations = sourceFiles(".ts", ".tsx")
      .filter((file) => file.includes(`${join("src", "app")}`) && !file.includes(".test."))
      .flatMap(findHardCodedMetadataCopy);

    expect(violations).toEqual([]);
  });
});

function sourceFiles(...extensions: string[]) {
  const files: string[] = [];
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (extensions.some((extension) => entry.name.endsWith(extension))) files.push(path);
    }
  }
  visit(sourceRoot);
  return files;
}

function findHardCodedMetadataCopy(file: string) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations: string[] = [];
  const visibleProperties = new Set(["applicationName", "description", "name", "short_name", "title"]);

  function inspectProperties(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      visibleProperties.has(node.name.getText(source)) &&
      (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
    ) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      violations.push(
        `${relativeSourcePath(file)}:${line + 1}: ${node.getText(source)}`,
      );
    }
    ts.forEachChild(node, inspectProperties);
  }

  function visit(node: ts.Node) {
    const isMetadataDeclaration =
      ts.isVariableDeclaration(node) && node.name.getText(source) === "metadata";
    const isManifestFunction = ts.isFunctionDeclaration(node) && node.name?.text === "manifest";
    if (isMetadataDeclaration || isManifestFunction) inspectProperties(node);
    else ts.forEachChild(node, visit);
  }

  visit(source);
  return violations;
}

function findVisibleJsxLiterals(file: string) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations: string[] = [];
  const visibleAttributes = new Set(["alt", "aria-label", "placeholder", "title"]);

  function record(node: ts.Node, value: string) {
    if (!/[A-Za-z\u3400-\u9fff]/.test(value)) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    violations.push(`${relativeSourcePath(file)}:${line + 1}: ${JSON.stringify(value)}`);
  }

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      record(node, node.getText(source).replace(/\s+/g, " ").trim());
    } else if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      visibleAttributes.has(node.name.getText(source))
    ) {
      record(node, node.initializer.text);
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isStringLiteral(node.expression)
    ) {
      record(node, node.expression.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return violations;
}

function relativeSourcePath(file: string) {
  return file.slice(sourceRoot.length + 1);
}
