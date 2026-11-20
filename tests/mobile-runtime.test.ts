import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import bundledRegions from "../src/view/regionFields-v2.json";
import { careerId } from "../src/core/identity";
// @ts-ignore build-time module
import { serviceWorker } from "../scripts/pwa-build.mjs";

test("bundled picking fields match the authored model without importing the public directory", () => {
  const authored = JSON.parse(
    fs.readFileSync(
      new URL("../public/assets/regions-v2.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(bundledRegions, authored.regions);
});

test("LAN HTTP can create and import valid independent career IDs without randomUUID", () => {
  const source = {
    getRandomValues<T extends ArrayBufferView | null>(value: T): T {
      if (value instanceof Uint8Array)
        for (let i = 0; i < value.length; i++) value[i] = i;
      return value;
    },
  };
  assert.equal(careerId(source), "bl-00010203-0405-4607-8809-0a0b0c0d0e0f");
  assert.match(
    careerId(),
    /^bl-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.notEqual(careerId(), careerId());
});

function runtime() {
  const handlers: Record<string, (event: any) => void> = {};
  const stores = new Map<string, Map<string, string>>([
    ["bulk-life-shell-old", new Map([["/index.html", "old shell"]])],
    ["other-app", new Map([["/", "keep"]])],
  ]);
  let activated = 0,
    claimed = 0,
    online = true;
  const self = {
    location: { origin: "https://bulk.example" },
    clients: {
      claim: async () => {
        claimed++;
      },
    },
    skipWaiting: () => {
      activated++;
    },
    addEventListener: (name: string, fn: any) => {
      handlers[name] = fn;
    },
  };
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (key: string) => stores.delete(key),
    open: async (key: string) => {
      if (!stores.has(key)) stores.set(key, new Map());
      const store = stores.get(key)!;
      return {
        match: async (url: string) => store.get(url),
        addAll: async (urls: string[]) => {
          if (!online) throw new Error("offline");
          for (const url of urls) store.set(url, "cached " + url);
        },
      };
    },
  };
  vm.runInNewContext(
    serviceWorker(
      ["/index.html", "/assets/game.js", "/assets/athlete-v2.glb"],
      "next",
    ),
    {
      self,
      caches,
      URL,
      fetch: async () => {
        if (!online) throw new Error("offline");
        return "network";
      },
    },
  );
  const wait = async (name: string) => {
    let promise: Promise<void> | undefined;
    handlers[name]({
      waitUntil: (p: Promise<void>) => {
        promise = p;
      },
    });
    await promise;
  };
  const request = async (url: string, mode = "cors") => {
    let promise: Promise<string> | undefined;
    handlers.fetch({
      request: { url, mode, method: "GET" },
      respondWith: (p: Promise<string>) => {
        promise = p;
      },
    });
    return promise ? await promise : undefined;
  };
  return {
    handlers,
    stores,
    wait,
    request,
    setOffline: () => {
      online = false;
    },
    counts: () => ({ activated, claimed }),
  };
}
test("offline shell and versioned 3D work after install; unrelated origins are not intercepted", async () => {
  const r = runtime();
  await r.wait("install");
  r.setOffline();
  assert.equal(
    await r.request("https://bulk.example/", "navigate"),
    "cached /index.html",
  );
  assert.equal(
    await r.request(
      "https://bulk.example/assets/athlete-v2.glb?v2-anatomy-123",
    ),
    "cached /assets/athlete-v2.glb",
  );
  assert.equal(await r.request("https://external.example/source"), undefined);
  assert.equal(
    await r.request("https://bulk.example/api/unrelated"),
    undefined,
  );
  assert.equal(r.counts().activated, 0);
  assert.ok(r.stores.has("bulk-life-shell-old"));
});
test("PWA waits for explicit update and removes only its own old cache on activation", async () => {
  const r = runtime();
  await r.wait("install");
  assert.equal(r.counts().activated, 0);
  r.handlers.message({ data: { type: "ACTIVATE_UPDATE" } });
  assert.equal(r.counts().activated, 1);
  await r.wait("activate");
  assert.equal(r.counts().claimed, 1);
  assert.ok(!r.stores.has("bulk-life-shell-old"));
  assert.equal(r.stores.get("other-app")?.get("/"), "keep");
});
test("failed offline preparation leaves the previous installed shell intact", async () => {
  const r = runtime();
  r.setOffline();
  await assert.rejects(() => r.wait("install"));
  assert.equal(
    r.stores.get("bulk-life-shell-old")?.get("/index.html"),
    "old shell",
  );
  assert.deepEqual(r.counts(), { activated: 0, claimed: 0 });
});
