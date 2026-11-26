// Run against a local production preview. Playwright may be supplied via NODE_PATH.
const { chromium } = require("playwright");
const fs = require("node:fs"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const folder = "docs/qa/turning-points";
fs.mkdirSync(folder, { recursive: true });
const route = process.argv[2],
  direct = process.argv[3] === "world",
  seed = 231;
const key = route + (direct ? "-direct" : "-continue");
async function stored(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const q = indexedDB.open("bulk-life-challenges-v1");
        q.onsuccess = () => {
          const db = q.result,
            r = db.transaction("runs").objectStore("runs").getAll();
          r.onsuccess = () => {
            db.close();
            resolve(r.result[0]);
          };
          r.onerror = () => reject(r.error);
        };
      }),
  );
}
function digest(r) {
  const json = JSON.stringify(
    {
      seed: r.seed,
      origin: r.origin,
      career: r.career,
      rivals: r.rivals,
      records: r.records,
      domestic: r.domestic,
      world: r.world,
    },
    (k, v) =>
      ["elapsedMs", "createdAt", "updatedAt", "startedAt"].includes(k)
        ? undefined
        : v,
  )
    .split(r.id)
    .join("PLAYER");
  return crypto.createHash("sha256").update(json).digest("hex");
}
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--enable-unsafe-swiftshader"],
  });
  const log = {
    seed,
    route,
    direct,
    browser: browser.version(),
    turns: [],
    errors: [],
  };
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(100000);
    page.on("pageerror", (e) => log.errors.push(e.message));
    await page.addInitScript((seed) => {
      const original = crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues = (a) =>
        a instanceof Uint32Array && a.length === 1
          ? ((a[0] = seed), a)
          : original(a);
    }, seed);
    const button = (name) => page.getByRole("button", { name });
    await page.goto(process.env.BULK_PREVIEW || "http://127.0.0.1:4187/");
    await button(direct ? /世界挑戦 · 40回/ : /日本挑戦 · 20回/).click();
    await button("この選手と挑戦を始める").click();
    const until = route === "message" ? 6 : 40;
    for (let n = 1; n <= until; n++) {
      const cards = page.locator(".challenge-strategies article");
      await cards.first().waitFor();
      const options = await cards.locator("h3").allTextContents(),
        issue = await page.locator(".challenge-issue p").first().innerText();
      const scene = await page.locator(".challenge-issue h2").innerText();
      let pattern = ["friend", "supported", "message"].includes(route)
        ? [/近所のジム/, /同じ大会/, /大会を分け/, route === "message" ? /会場へ行かず/ : /準備を手伝う/][n - 1]
        : route === "home"
          ? [/自宅で記録/, /単発/, /公開練習/, /相談した時間に/][n - 1]
          : [/元選手/, /今回の測定会/][n - 1];
      if (!pattern && route === "supported" && n === 6)
        pattern = /サポートを頼んで/;
      if (!pattern && route === "friend" && n <= 20)
        pattern =
          /舞台を見送り練習の補助|勤務を維持|自分で週間|規定ポーズ|練習帳を添え|今期は出場を見送り|自宅中心/;
      if (!pattern)
        pattern =
          /出場資格のある舞台|声をかけ|日程を合わせて|規定ポーズ|重点にする|練習帳を添え/;
      let index = options.findIndex((name) => pattern.test(name));
      if (n > 4 && !(route === "friend" && n <= 20)) {
        const entry = options.findIndex((name) =>
          name.includes("出場資格のある舞台"),
        );
        if (entry >= 0) index = entry;
      }
      if (index < 0) index = 0;
      await cards.nth(index).getByRole("button").click();
      const confirm = button(new RegExp("決断" + n + "を確定"));
      if (!(await confirm.isEnabled())) {
        await page.keyboard.press("Escape");
        index = 0;
        await cards.first().getByRole("button").click();
      }
      if (n === 3)
        await confirm.evaluate((b) => {
          b.click();
          b.click();
        });
      else await confirm.click();
      const next = button(
        n === 20
          ? /国内編の結果を振り返る/
          : n === 40
            ? /世界編の結果を振り返る/
            : new RegExp("決断" + (n + 1) + "の作戦を考える"),
      );
      try {
        await next.waitFor({ timeout: 240000 });
      } catch (error) {
        console.error(await page.locator("body").innerText());
        throw error;
      }
      let r = await stored(page);
      assert.equal(r.records.length, n);
      const rec = r.records.at(-1);
      const response = await page
        .locator(".challenge-period blockquote")
        .first()
        .innerText();
      assert.equal(response, rec.response);
      log.turns.push({
        n,
        scene,
        issue,
        options,
        choice: rec.strategy.name,
        fact: rec.fact,
        show: rec.show && { tier: rec.show.tier, rank: rec.show.rank },
        response,
        money: rec.afterMoney,
        muscleKg: Object.values(rec.after.muscle).reduce(
          (sum, v) => sum + v,
          0,
        ),
        trainingDays: rec.stats.trainingDays,
        preparation: rec.show?.preparation,
      });
      if (n <= 6 || n === 20 || n === 21)
        console.log(n, rec.strategy.id, rec.show?.rank || "");
      if (n === 5) {
        const before = digest(r);
        await page.reload();
        await button(/つづきから/)
          .first()
          .click();
        await next.waitFor();
        await button("キャリア記録").click();
        await button(/決断1 ·/)
          .first()
          .click();
        await button("記録を閉じる").click();
        await page.getByRole("button", { name: "決断", exact: true }).click();
        await next.waitFor();
        assert.equal(digest(await stored(page)), before);
      }
      if (n === 20 || n === 40) log["at" + n] = digest(r);
      if ([2, 4, 6, 20, 21, 40].includes(n) && route !== "mentor") {
        await page
          .locator(".challenge-period blockquote")
          .scrollIntoViewIfNeeded();
        await page.screenshot({ path: folder + "/" + key + "-" + n + ".png" });
      }
      await next.click();
      if (n === 20 || n === 40) {
        await page.locator(".challenge-ending").waitFor();
        log["ending" + n] = await page
          .locator(".challenge-ending > p")
          .first()
          .innerText();
        if (n === 20) {
          log.domestic = r.domestic;
          await button(
            direct ? /世界編の決断21へ/ : /世界編の追加20回へ/,
          ).click();
        } else {
          r = await stored(page);
          assert.equal(r.status, "worldEnd");
          assert.deepEqual(r.domestic, log.domestic);
        }
      }
    }
    if (route === "message") {
      assert.equal(log.turns[3].fact.action, "message");
      assert.ok(log.turns.every((t) => t.fact.event !== "returnHelp"));
      assert.ok(log.turns.every((t) => !t.fact.sharedStart));
    }
    assert.equal(log.errors.length, 0);
    log.passed = true;
  } finally {
    fs.writeFileSync(
      folder + "/" + key + ".json",
      JSON.stringify(log, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
