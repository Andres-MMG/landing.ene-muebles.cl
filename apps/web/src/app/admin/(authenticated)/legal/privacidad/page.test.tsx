import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getLegalPageForAdmin = vi.hoisted(() => vi.fn());
vi.mock("../_lib/legal-admin", () => ({ getLegalPageForAdmin }));
vi.mock("../LegalForm", () => ({
  LegalForm: ({ code }: { code: string }) => (
    <div data-form-code={code} data-endpoint={`/api/admin/legal/${code}`} />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getLegalPageForAdmin.mockResolvedValue({});
});

describe("fixed privacy editor page", () => {
  it("loads the privacy draft and fixes the form identity to the privacy endpoint", async () => {
    const { default: PrivacyEditorPage } = await import("./page");
    const html = renderToStaticMarkup(await PrivacyEditorPage());

    expect(getLegalPageForAdmin).toHaveBeenCalledOnce();
    expect(getLegalPageForAdmin).toHaveBeenCalledWith("privacy");
    expect(html).toContain('data-form-code="privacy"');
    expect(html).toContain('data-endpoint="/api/admin/legal/privacy"');
    expect(html).not.toContain('data-form-code="terms"');
  });
});
