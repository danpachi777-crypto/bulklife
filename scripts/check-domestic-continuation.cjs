// The two input archives are produced by scripts/audit-turning-points.ts.
const { chromium } = require("playwright");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--enable-unsafe-swiftshader"],
  });
  const report = [];
  try {
    for (const kind of ["low", "top"]) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
      });
      await page.goto(process.env.BULK_PREVIEW || "http://127.0.0.1:4187/");
      await page
        .locator("input[type=file]")
        .setInputFiles(path.join(os.tmpdir(), "bulk-turn-" + kind + ".json"));
      await page.getByRole("button", { name: "この記録を開く" }).click();
      const ending = await page
        .locator(".challenge-ending > p")
        .first()
        .innerText();
      await page.getByRole("button", { name: /世界編の追加20回へ/ }).click();
      const options = await page
        .locator(".challenge-strategies article h3")
        .first()
        .waitFor()
        .then(() =>
          page.locator(".challenge-strategies article h3").allTextContents(),
        );
      const issue = await page
        .locator(".challenge-issue p")
        .first()
        .innerText();
      assert.equal(
        options.some((x) => x.includes("ワールドファイナル")),
        kind === "top",
      );
      report.push({ kind, ending, issue, options });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    "docs/qa/turning-points/continuation-screen.json",
    JSON.stringify(report, null, 2),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
