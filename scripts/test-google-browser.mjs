// Isolated local browser verification. No forms, payments, accounts or third-party beacons.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = new URL(process.env.QA_ORIGIN || 'http://localhost:3105');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Browser checks only target localhost.');
const browserFile = [chromium.executablePath(), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
assert.ok(browserFile, 'Installed Chromium-compatible browser');
const browser = await chromium.launch({ headless: true, executablePath: browserFile });
mkdirSync('outputs', { recursive: true });
const report = [];
try {
  const widths = process.env.QA_WIDTHS ? process.env.QA_WIDTHS.split(',').map(Number) : [1440, 390, 320];
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addCookies([{ name: 'bdb_consent', value: 'refused', url: base.origin }]);
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.origin === base.origin || url.protocol === 'data:' ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of ['/boutique-de-boxe-toulouse/', '/gants-de-boxe/']) {
      await page.goto(new URL(path, base).href, { waitUntil: 'networkidle', timeout: 90000 });
      const marker = path.includes('toulouse') ? '[data-city-commerce]' : '[data-buying-brief]';
      await page.locator(marker).waitFor({ state: 'visible' });
      assert.equal(await page.locator('main h1').count(), 1);
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      if (dimensions.document > dimensions.viewport + 1) {
        const overflow = await page.locator('body *').evaluateAll((nodes) => nodes.map((node) => ({ tag: node.tagName, class: node.getAttribute('class'), right: node.getBoundingClientRect().right, left: node.getBoundingClientRect().left, top: node.getBoundingClientRect().top, text: node.textContent?.trim().slice(0, 70), parent: node.parentElement?.outerHTML.slice(0, 400) })).filter((node) => node.right > innerWidth + 1 || node.left < -1).slice(0, 18));
        await page.screenshot({ path: `outputs/seo-overflow-${width}.png` });
        console.error(JSON.stringify({ path, width, overflow }, null, 2));
      }
      assert.ok(dimensions.document <= dimensions.viewport + 1, `No horizontal overflow ${width} ${path}: ${JSON.stringify(dimensions)}`);
      await page.screenshot({ path: `outputs/seo-${path.includes('toulouse') ? 'toulouse' : 'gloves'}-${width}.png` });
      report.push({ path, width, ...dimensions });
    }
    const productPath = '/produits/gants-boxe-blade-metal-boxe-noir-blanc/';
    const first = await context.request.get(new URL('/flux-marchand.xml', base).href);
    const feed = await first.text();
    const item = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]).find((text) => text.includes(productPath) && text.includes('<g:size>'));
    assert.ok(item, 'Existing product-size feed item');
    const size = item.match(/<g:size>(.*?)<\/g:size>/)[1];
    const landing = new URL(item.match(/<g:link>(.*?)<\/g:link>/)[1].replace(/&amp;/g, '&'));
    await page.goto(new URL(landing.pathname + landing.search, base).href, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: size, exact: true }).waitFor({ state: 'visible' });
    // The size button is already visible in SSR HTML; await its advertised hydrated state.
    await page.waitForFunction((value) => Array.from(document.querySelectorAll('button')).some((button) => button.textContent?.trim() === value && button.getAttribute('aria-pressed') === 'true'), size, { timeout: 15000 });
    assert.equal(await page.getByRole('button', { name: size, exact: true }).getAttribute('aria-pressed'), 'true', 'Advertised size selected');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://www.boutique-de-boxe.com' + productPath);
    await page.goto(new URL(productPath + '?taille=not-a-size', base).href, { waitUntil: 'networkidle' });
    assert.equal(await page.getByRole('button', { name: size, exact: true }).getAttribute('aria-pressed'), 'false', 'Unknown size never selects an arbitrary variant');
    assert.deepEqual(errors, [], `No browser exceptions at ${width}px`);
    await context.close();
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  await page.goto(new URL('/boutique-de-boxe-toulouse/', base).href);
  assert.ok(await page.locator('[data-city-commerce]').isVisible(), 'Purchasing answer readable without JavaScript');
  assert.ok(await page.locator('#lieux').count(), 'Retained directory without JavaScript');
  await context.close();
  writeFileSync('outputs/google-browser.json', JSON.stringify({ measuredAt: new Date().toISOString(), report, noJavaScript: 'pass', variantSelection: 'pass', exceptions: [] }, null, 2));
  console.log('PASS: 1440/390/320px purchasing content, no overflow, exact-size feed landings, unchanged canonical, unknown-size rejection and no-JS city content. No transactions.');
} finally {
  await browser.close();
}
