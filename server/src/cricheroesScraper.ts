// Best-effort scraper for an individual CricHeroes player profile page.
//
// IMPORTANT CONTEXT - read before touching selectors:
//
// CricHeroes has no public developer API (confirmed - checked their privacy
// policy and searched for developer docs; nothing exists beyond an
// unofficial, community-maintained Python package that scrapes team pages
// via Selenium). This module is the same category of thing: unofficial,
// against the spirit of their Terms of Service, and will break without
// warning if they change their site. That tradeoff was a deliberate,
// informed decision, not an oversight - see the PRD/README for the
// discussion.
//
// It was ALSO not possible to verify these selectors against the live site
// from the sandbox this was built in: headless Chromium cannot launch there
// (missing system shared libraries, no root access to install them via
// `playwright install-deps`). The scraper below is built from the site's
// public URL structure (confirmed via search:
// cricheroes.com/player-profile/<id>/<slug>/matches) and from patterns seen
// in the unofficial Python package's team-page scraper (class names like
// `.stat-item`, `.stat-item-value`, `.stat-item-name`, `#player-banner` -
// that package scrapes the *team* stats tab, which is very likely the same
// underlying component library as the player profile page, but this is an
// inference, not a confirmed fact).
//
// TREAT THIS AS UNTESTED. Before relying on it: run
// `npx playwright install --with-deps chromium` on a real machine (not this
// sandbox), call scrapePlayerProfile() with a real profile URL, and check
// what actually comes back. If selectors don't match, the CANDIDATE_*
// arrays below are the only thing you should need to edit - everything
// else (caching, admin trigger, graceful fallback) already works
// independently of whether the scrape succeeds.
//
// Deliberately decoupled from live bidding: this only ever runs when an
// admin explicitly triggers a sync (or right after a CSV import), never
// during SET_ACTIVE_PLAYER / PLACE_BID / timers. A slow or failed scrape
// can never stall a live auction.

import { chromium } from 'playwright';

export interface ScrapeResult {
  photoUrl?: string;
  stats: Record<string, string>;
}

const NAV_TIMEOUT_MS = 20000;
const OVERALL_TIMEOUT_MS = 30000;

// Ordered by how likely each is to work - og:image is the safest bet
// because it's usually present for link-preview purposes regardless of
// how the rest of the page is rendered.
const PHOTO_SELECTORS = [
  'meta[property="og:image"]', // read `content` attribute, not text
  '#player-banner img',
  '.profile-pic img',
  '.player-profile-pic img',
  'img.profile-image',
];

// Stat blocks: try the team-stats-page pattern first (best guess), then a
// couple of generic fallbacks.
const STAT_BLOCK_SELECTOR_CANDIDATES = [
  { container: '.stat-item', label: '.stat-item-name', value: '.stat-item-value' },
  { container: '[class*="stat-item"]', label: '[class*="name"]', value: '[class*="value"]' },
];

export function isLikelyCricheroesUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)cricheroes\.(com|in)$/.test(u.hostname) && u.pathname.includes('player-profile');
  } catch {
    return false;
  }
}

export async function scrapePlayerProfile(url: string): Promise<ScrapeResult> {
  if (!isLikelyCricheroesUrl(url)) {
    throw new Error('URL does not look like a CricHeroes player profile (expected .../player-profile/<id>/<slug>/...)');
  }

  const result = scrapeInternal(url);
  const timeout = new Promise<ScrapeResult>((_, reject) =>
    setTimeout(() => reject(new Error('Scrape timed out after 30s')), OVERALL_TIMEOUT_MS)
  );
  return Promise.race([result, timeout]);
}

async function scrapeInternal(url: string): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });

    const photoUrl = await extractPhoto(page);
    const stats = await extractStats(page);

    return { photoUrl, stats };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function extractPhoto(page: import('playwright').Page): Promise<string | undefined> {
  for (const selector of PHOTO_SELECTORS) {
    try {
      const el = await page.$(selector);
      if (!el) continue;
      const src = selector.startsWith('meta') ? await el.getAttribute('content') : await el.getAttribute('src');
      if (src) return src;
    } catch {
      // try next candidate
    }
  }
  return undefined;
}

async function extractStats(page: import('playwright').Page): Promise<Record<string, string>> {
  for (const candidate of STAT_BLOCK_SELECTOR_CANDIDATES) {
    try {
      const stats = await page.$$eval(
        candidate.container,
        (nodes, sel) => {
          const out: Record<string, string> = {};
          nodes.forEach((node) => {
            const labelEl = node.querySelector(sel.label);
            const valueEl = node.querySelector(sel.value);
            const label = labelEl?.textContent?.trim();
            const value = valueEl?.textContent?.trim();
            if (label && value) out[label] = value;
          });
          return out;
        },
        candidate
      );
      if (Object.keys(stats).length > 0) return stats;
    } catch {
      // try next candidate
    }
  }
  return {};
}
