import { defineConfig } from "vite";
// @ts-ignore build-time JavaScript plugin
import { pwaBuild } from "./scripts/pwa-build.mjs";
export default defineConfig({
  plugins: [pwaBuild()],
  preview: { host: "0.0.0.0", port: 4178, strictPort: true },
});
