import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import {
  LOCALE_STORAGE_KEY,
  presentError,
  translate,
  type TranslationFunction,
} from "./index";
import { LocalizationProvider, useLocalization } from "./localization-provider";

function LocaleHarness() {
  const { setLocale, t } = useLocalization();
  return (
    <>
      <p>{t("navigation.home")}</p>
      <p>{t("common.protocol")}</p>
      <button type="button" onClick={() => setLocale("zh-CN")}>
        简体中文
      </button>
      <button type="button" onClick={() => setLocale("en-US")}>
        English
      </button>
    </>
  );
}

describe("LocalizationProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "";
  });

  it("uses Simplified Chinese by default and renders canonical terminology", async () => {
    render(
      <LocalizationProvider>
        <LocaleHarness />
      </LocalizationProvider>,
    );

    expect(screen.getByText("首页")).toBeInTheDocument();
    expect(screen.getByText("实验方案")).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.lang).toBe("zh-CN"));
  });

  it("switches locale, updates html lang, and persists the preference", async () => {
    const user = userEvent.setup();
    render(
      <LocalizationProvider>
        <LocaleHarness />
      </LocalizationProvider>,
    );

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Protocol")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en-US");
  });

  it("restores a saved locale after reload", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en-US");
    render(
      <LocalizationProvider>
        <LocaleHarness />
      </LocalizationProvider>,
    );

    await waitFor(() => expect(screen.getByText("Home")).toBeInTheDocument());
    expect(document.documentElement.lang).toBe("en");
  });

  it("localizes client-side service failures without rewriting API payload messages", () => {
    const t: TranslationFunction = (key, values) => translate("zh-CN", key, values);

    expect(presentError({ status: 0 }, t, "common.somethingWrong")).toBe(
      "无法连接本地服务。请确认 API 已启动，然后重试。",
    );
    const fallbackError = Object.assign(new Error("project_request_failed"), {
      code: "project_request_failed",
      status: 503,
    });
    expect(presentError(fallbackError, t, "common.somethingWrong")).toBe(
      "请求失败，状态码 503。",
    );
    expect(presentError(new Error("Scientific value was rejected"), t, "common.somethingWrong")).toBe(
      "Scientific value was rejected",
    );
  });
});
