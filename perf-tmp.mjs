import puppeteer from "puppeteer-core";
const routes = ["/profissionais", "/para-pacientes", "/academico"];
const browser = await puppeteer.launch({ executablePath: "/bin/chromium", headless: true, args: ["--no-sandbox","--disable-dev-shm-usage"] });
for (const r of routes) {
  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  await client.send("Performance.enable");
  const reqs = [];
  page.on("response", res => reqs.push({url: res.url().split("/").pop(), status: res.status()}));
  const t0 = Date.now();
  await page.goto(`http://localhost:4173${r}`, { waitUntil: "networkidle0", timeout: 30000 });
  const t1 = Date.now();
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint").map(p => [p.name, p.startTime]);
    const resources = performance.getEntriesByType("resource").map(r => ({name: r.name.split("/").pop(), dur: r.duration, size: r.transferSize}));
    return { domContentLoaded: nav.domContentLoadedEventEnd, loadEvent: nav.loadEventEnd, paints, resCount: resources.length, totalTransfer: resources.reduce((a,b)=>a+b.size,0), slowest: resources.sort((a,b)=>b.dur-a.dur).slice(0,8) };
  });
  console.log("ROUTE", r, "wall_ms", t1-t0);
  console.log(JSON.stringify(metrics, null, 2));
  await page.close();
}
await browser.close();
