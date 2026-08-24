import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocalizationProvider } from "@/locales/localization-provider";

import { Breadcrumb } from "./breadcrumb";
import styles from "./ui.module.css";

describe("Breadcrumb", () => {
  it("keeps each separator and label in the same flex-aligned list item", () => {
    render(<Breadcrumb items={[{ href: "/", label: "Home" }, { label: "Analysis" }]} />);

    const navigation = screen.getByRole("navigation", { name: "Breadcrumb" });
    const items = within(navigation).getAllByRole("listitem");
    const separator = items[1].querySelector("span[aria-hidden='true']");

    expect(separator).toBeInTheDocument();
    expect(separator?.parentElement).toBe(items[1]);
    expect(items[1]).toHaveClass(styles.breadcrumbItem);
    expect(separator).toHaveClass(styles.breadcrumbSeparator);
    expect(separator?.nextElementSibling).toHaveAttribute("aria-current", "page");
    expect(separator?.firstElementChild?.tagName).toBe("svg");
  });

  it("renders the localized navigation label with Chinese content", () => {
    render(
      <LocalizationProvider>
        <Breadcrumb items={[{ href: "/", label: "首页" }, { label: "分析" }]} />
      </LocalizationProvider>,
    );

    expect(screen.getByRole("navigation", { name: "面包屑导航" })).toHaveTextContent("首页分析");
  });
});
