import fs from "node:fs";
const source = new URL("../public/assets/regions-v2.json", import.meta.url);
const target = new URL("../src/view/regionFields-v2.json", import.meta.url);
const { regions } = JSON.parse(fs.readFileSync(source, "utf8"));
fs.writeFileSync(target, JSON.stringify(regions, null, 2) + "\n");
