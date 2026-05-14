import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'http://localhost:5173/#/map';

const KEEP_CLASS_TOKENS = [
  'map-container',
  'cesium-viewer',
  'top-toolbar',
  'toolbar-',
  'top-panel',
  'panel-',
  'right-toolbar',
  'camera-info-panel',
  'scale-bar',
  'official-layer-picker',
  'view-cube',
  'voice',
  'cctv',
  'bird',
  'carbon',
  'hk3d',
  'cesium-'
];

function hasInterestingClass(el) {
  const cls = (el.className || '').toString();
  if (!cls) return false;
  return KEEP_CLASS_TOKENS.some((token) => cls.includes(token));
}

function isInteresting(el) {
  if (!(el instanceof Element)) return false;

  if (el.id === 'root' || el.id === 'official-layer-picker') return true;
  if (hasInterestingClass(el)) return true;

  const tag = el.tagName.toLowerCase();
  if (['html', 'body', 'canvas'].includes(tag)) return true;

  return false;
}

function labelFor(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = (el.className || '').toString().trim();
  const firstClasses = cls
    ? '.' + cls.split(/\s+/).slice(0, 3).join('.')
    : '';
  return `${tag}${id}${firstClasses}`;
}

function emitTree(node, depth, out, maxDepth) {
  if (!(node instanceof Element)) return;
  if (depth > maxDepth) return;

  const children = Array.from(node.children).filter((child) => isInteresting(child));
  const suffix = children.length > 0 ? ` (${children.length})` : '';
  out.push(`${'  '.repeat(depth)}- ${labelFor(node)}${suffix}`);

  for (const child of children) {
    emitTree(child, depth + 1, out, maxDepth);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.map-container', { timeout: 30000 });
  await page.waitForTimeout(4000);

  const tree = await page.evaluate(() => {
    const KEEP_CLASS_TOKENS = [
      'map-container',
      'cesium-viewer',
      'top-toolbar',
      'toolbar-',
      'top-panel',
      'panel-',
      'right-toolbar',
      'camera-info-panel',
      'scale-bar',
      'official-layer-picker',
      'view-cube',
      'voice',
      'cctv',
      'bird',
      'carbon',
      'hk3d',
      'cesium-'
    ];

    function hasInterestingClass(el) {
      const cls = (el.className || '').toString();
      if (!cls) return false;
      return KEEP_CLASS_TOKENS.some((token) => cls.includes(token));
    }

    function isInteresting(el) {
      if (!(el instanceof Element)) return false;
      if (el.id === 'root' || el.id === 'official-layer-picker') return true;
      if (hasInterestingClass(el)) return true;

      const tag = el.tagName.toLowerCase();
      if (['html', 'body', 'canvas'].includes(tag)) return true;
      return false;
    }

    function labelFor(el) {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = (el.className || '').toString().trim();
      const firstClasses = cls
        ? '.' + cls.split(/\s+/).slice(0, 3).join('.')
        : '';
      return `${tag}${id}${firstClasses}`;
    }

    function emitTree(node, depth, out, maxDepth) {
      if (!(node instanceof Element)) return;
      if (depth > maxDepth) return;

      const children = Array.from(node.children).filter((child) => isInteresting(child));
      const suffix = children.length > 0 ? ` (${children.length})` : '';
      out.push(`${'  '.repeat(depth)}- ${labelFor(node)}${suffix}`);

      for (const child of children) {
        emitTree(child, depth + 1, out, maxDepth);
      }
    }

    const out = [];
    emitTree(document.documentElement, 0, out, 8);
    return out.join('\n');
  });

  await writeFile('dom-tree-map-devtools-style.txt', tree, 'utf8');
  console.log('Saved dom-tree-map-devtools-style.txt');
} finally {
  await browser.close();
}
