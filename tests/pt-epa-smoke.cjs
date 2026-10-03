const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const ptEpaChrome = process.env.PT_EPA_CHROME_BIN;
  const browser = await chromium.launch({
    headless: true,
    ...(ptEpaChrome ? { executablePath: ptEpaChrome } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.click("#prof-pt");

  assert.deepEqual(await page.locator("#domaintabs button").allTextContents(), ["骨科", "生理", "兒童"]);
  assert.equal(await page.locator("#epatabs button").count(), 2);
  assert.match(await page.locator("#topicTitle").textContent(), /EPA1.*上肢肌骨/);
  assert.equal(await page.locator("#itemList .item").count(), 10);
  assert.equal(await page.locator("#lv-0 button").count(), 3);
  assert.equal(await page.locator("#lv-ov button").count(), 6);
  await page.locator("#epatabs button").filter({ hasText: "EPA2" }).click();
  assert.equal(await page.locator("#itemList .item").count(), 10);
  await page.locator("#epatabs button").filter({ hasText: "EPA1" }).click();

  await page.locator("#lv-ov button").filter({ hasText: "Level 4" }).click();
  await page.getByRole("button", { name: "符合", exact: true }).first().click();

  await page.locator("#domaintabs button").filter({ hasText: "生理" }).click();
  assert.equal(await page.locator("#epatabs button").count(), 4);
  for (const [code, rows] of [["EPA3", 16], ["EPA4", 12], ["EPA5", 13], ["EPA8", 11]]) {
    await page.locator("#epatabs button").filter({ hasText: code }).click();
    assert.equal(await page.locator("#itemList .item").count(), rows, code);
  }
  await page.locator("#epatabs button").filter({ hasText: "EPA8" }).click();
  assert.equal(await page.locator("#ptCaseWrap").evaluate(el => getComputedStyle(el).display), "flex");
  assert.equal(await page.locator("#chips_pt_case button").count(), 5);
  await page.locator("#chips_pt_case button").filter({ hasText: "急性中風" }).click();
  await page.locator("#lv-ov button").filter({ hasText: "Level 3" }).click();
  await page.getByRole("button", { name: "符合", exact: true }).first().click();
  await page.evaluate(() => buildPrint());
  const printText = await page.locator("#printArea").innerText();
  assert.match(printText, /物理治療/);
  assert.match(printText, /急性中風/);
  assert.match(printText, /Level 3/);
  assert.match(printText, /符合/);

  await page.locator("#domaintabs button").filter({ hasText: "兒童" }).click();
  assert.equal(await page.locator("#epatabs button").count(), 2);
  await page.locator("#epatabs button").filter({ hasText: "EPA6" }).click();
  assert.equal(await page.locator("#itemList .item").count(), 11);
  await page.locator("#epatabs button").filter({ hasText: "EPA7" }).click();
  assert.equal(await page.locator("#itemList .item").count(), 11);

  await page.screenshot({ path: "/private/tmp/pt-epa-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/private/tmp/pt-epa-mobile.png", fullPage: true });

  await page.click("#prof-ot");
  assert.deepEqual(await page.locator("#domaintabs button").allTextContents(), ["生理領域", "兒童領域"]);
  assert.equal(await page.locator("#epatabs button").count(), 6);
  assert.equal(await page.locator("#lv-0 button").count(), 10);
  assert.equal(await page.locator(".phys-only").first().evaluate(el => getComputedStyle(el).display), "flex");
  await page.evaluate(() => buildPrint());
  assert.match(await page.locator("#printArea").innerText(), /社團法人臺灣職能治療學會/);

  assert.deepEqual(errors, []);
  await browser.close();
  console.log("PT EPA smoke test passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
