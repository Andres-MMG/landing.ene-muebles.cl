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

describe("fixed terms editor page", () => {
  it("loads the terms draft and fixes the form identity to the terms endpoint", async () => {
    const { default: TermsEditorPage } = await import("./page");
    const html = renderToStaticMarkup(await TermsEditorPage());

    expect(getLegalPageForAdmin).toHaveBeenCalledOnce();
    expect(getLegalPageForAdmin).toHaveBeenCalledWith("terms");
    expect(html).toContain('data-form-code="terms"');
    expect(html).toContain('data-endpoint="/api/admin/legal/terms"');
    expect(html).not.toContain("privacy");
  });
});
