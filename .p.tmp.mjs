import { chromium } from "playwright";
const b = await chromium.launch(); const out = process.argv[2]; const path = process.argv[3]; const w = Number(process.argv[4] ?? 1440);
const p = await b.newPage({ viewport: { width: w, height: 900 } });
const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text())); p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:3005" + path, { waitUntil: "networkidle" }); await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/new-${path.replace(/\W+/g, "_")}-${w}.png`, fullPage: true });
console.log(path, w, "noSide", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "errors", errs.length, errs[0] ?? "");
await b.close();
