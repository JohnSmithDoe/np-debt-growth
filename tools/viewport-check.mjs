import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const argv = process.argv.slice(2);
const opt = (name, fallback) =>
  argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ??
  fallback;

const URL = opt('url', 'http://localhost:4200');

const SIZES = [
  [1008, 640],
  [1280, 800],
  [1920, 1080],
];

function loadPlaywright() {
  for (const base of [
    `${process.cwd()}/`,
    (() => {
      try {
        return `${execSync('npm root -g', { encoding: 'utf8' }).trim()}/`;
      } catch {
        return null;
      }
    })(),
  ]) {
    if (!base) continue;
    try {
      return createRequire(base)('playwright-core');
    } catch {
    }
  }
  console.error(
    'playwright-core not found. Install once:  npm i -g playwright-core'
  );
  process.exit(2);
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ channel: 'chrome' });
const failures = [];

for (const [width, height] of SIZES) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const door = page.locator('cb-title-screen button').first();
  if (await door.count()) {
    await door.click();
    await page.waitForTimeout(1200);
  }

  await page.evaluate(() => window.debtGrowth.grant(1_000_000, 1_000));
  await page.waitForTimeout(300);

  const overflow = async () =>
    page.evaluate(() => {
      const el = document.documentElement;
      return {
        y: el.scrollHeight - el.clientHeight,
        x: el.scrollWidth - el.clientWidth,
      };
    });

  const fits = async (name) => {
    const over = await overflow();
    const where = `${width}x${height} · ${name}`;
    if (over.y > 0) failures.push(`${where}: page scrolls ${over.y}px DOWN`);
    if (over.x > 0) failures.push(`${where}: page scrolls ${over.x}px ACROSS`);
    if (over.y <= 0 && over.x <= 0) console.log(`  ok  ${where}`);
  };

  await fits('Board');

  // The shop grew a third tab; each has to fit on its own.
  for (const tab of ['Rates', 'Crew']) {
    await page
      .locator('cb-supply-panel .tabs button', { hasText: tab })
      .click();
    await page.waitForTimeout(300);
    await fits(`Shop · ${tab}`);
  }

  await page.getByRole('button', { name: /open the tree/i }).click();
  await page.waitForTimeout(1200);

  if ((await page.locator('.interval-bar').count()) === 0) {
    failures.push(`${width}x${height}: the tree never opened`);
  } else {
    await fits('Skills');
    await page.getByRole('button', { name: /back to the floor/i }).click();
    await page.waitForTimeout(900);
    if ((await page.locator('.interval-bar').count()) > 0) {
      failures.push(`${width}x${height}: the tree would not close`);
    }
  }

  await page.close();
}

if (!argv.includes('--keep')) await browser.close();

if (failures.length) {
  console.error(`\nThe page is scrolling. It is a viewport, not a document.\n`);
  for (const f of failures) console.error(`  FAIL  ${f}`);
  console.error(
    `\nUsually a missing \`min-height: 0\` somewhere on the chain from :host to` +
      ` the scrolling box — a flex/grid child defaults to min-content, so one` +
      ` missing link stops a list scrolling inside its box and grows the page` +
      ` instead.\n`
  );
  process.exit(1);
}

console.log(`\nAll screens fit. The page did not scroll.`);
