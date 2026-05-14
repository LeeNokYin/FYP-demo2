import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'http://localhost:5173';

async function capture(page, path, waitForSelector, outFile, waitMs = 2500) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 30000 });
  }
  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }

  const html = await page.evaluate(() => {
    const doctype = new XMLSerializer().serializeToString(document.doctype);
    return `${doctype}\n${document.documentElement.outerHTML}`;
  });

  await writeFile(outFile, html, 'utf8');
  console.log(`Saved ${outFile}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

try {
  await capture(page, '/#/', '.welcome-container', 'dom-snapshot-welcome.html', 1200);
  await capture(page, '/#/map', '.map-container', 'dom-snapshot-map.html', 4500);
} finally {
  await browser.close();
}
