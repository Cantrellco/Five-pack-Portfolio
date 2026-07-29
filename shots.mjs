import { chromium } from '@playwright/test';
const OUT = '/tmp/claude-0/-home-user-PC-Pro-Inspections/ea5f1212-fafc-5b50-8a2f-b74cefd3a159/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
for (const [name, w, h] of [['1440', 1440, 900], ['768', 768, 1024], ['390', 390, 844]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto('http://127.0.0.1:3150/', { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${OUT}/fin-${name}-hero.png` });
  const top = await p.evaluate(() => document.querySelector('#field-plot').getBoundingClientRect().top + window.scrollY);
  await p.evaluate(([y, vh]) => window.scrollTo(0, y - (vh - 288) / 2), [top, h]);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/fin-${name}-resolve.png` });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/fin-${name}-foot.png` });
  await p.screenshot({ path: `${OUT}/fin-${name}-full.png`, fullPage: true });
  console.log(name, 'ok');
  await p.close();
}
await b.close();
