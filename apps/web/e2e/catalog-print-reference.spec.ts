import { expect, test } from "playwright/test";

const catalogPrintUrl = process.env.CATALOG_PRINT_URL ?? "http://localhost:4780/catalogo/imprimir";

function countPdfPages(pdf: Buffer): number {
  return pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

test("renders a fixed A4 landscape catalog document without split print pages", async ({
  page,
}, testInfo) => {
  const response = await page.goto(catalogPrintUrl, { waitUntil: "networkidle" });

  expect(response?.status(), `Expected catalog print route at ${catalogPrintUrl}`).toBe(200);

  const pageFamilies = page.locator("[data-page-family]");
  await expect(pageFamilies.first()).toHaveAttribute("data-page-family", "cover");
  await expect(pageFamilies.nth(1)).toHaveAttribute("data-page-family", "index");
  const pageFamilyCount = await pageFamilies.count();
  expect(pageFamilyCount).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".print-page")).toHaveCount(pageFamilyCount);

  await expect(page.locator(".print-cover")).toHaveCSS("background-image", /linear-gradient/);
  expect(
    await page
      .locator(".print-index-columns")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length),
  ).toBe(2);
  await expect(page.locator(".print-category-header")).toHaveCSS(
    "background-color",
    "rgb(41, 41, 41)",
  );
  expect(
    await page
      .locator(".print-product-grid")
      .first()
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length),
  ).toBe(4);
  const printPageBox = await page.locator(".print-page").first().boundingBox();
  expect(printPageBox).not.toBeNull();
  expect(printPageBox!.width / printPageBox!.height).toBeCloseTo(297 / 210, 2);
  expect(
    await page.locator(".print-page").evaluateAll((pages) =>
      pages.every((printPage) => {
        const style = getComputedStyle(printPage);
        return style.breakInside === "avoid" && style.pageBreakInside === "avoid";
      }),
    ),
  ).toBe(true);

  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({
    format: "A4",
    landscape: true,
    preferCSSPageSize: true,
    printBackground: true,
  });

  expect(countPdfPages(pdf)).toBe(pageFamilyCount);
  await testInfo.attach("catalog-print-reference.pdf", {
    body: pdf,
    contentType: "application/pdf",
  });
  await page.screenshot({
    path: testInfo.outputPath("catalog-print-reference.png"),
    fullPage: true,
  });
});
