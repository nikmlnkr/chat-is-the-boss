#!/usr/bin/env node
/**
 * Expert Game Tester — instrumented playthrough harness.
 *
 * Loads an HTML5 game (local folder or URL) in headless Chrome, plays it
 * according to an actions plan (or a generic probe), and records everything
 * a human tester would notice: load time, console errors, FPS, frozen frames,
 * failed asset requests, and screenshots at every meaningful moment.
 *
 * Usage:
 *   node harness.js --target <folder-or-url> --out <output-dir>
 *                   [--actions <actions.json>] [--profile desktop|mobile|both]
 *                   [--label <run-label>]
 *
 * Output: <out>/session.json + <out>/shots/*.png
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// ---------- resolve puppeteer-core (skill dirs are read-only; deps live in workdir) ----------
function resolvePuppeteer() {
  const candidates = [
    'puppeteer-core',
    path.join(process.env.HOME || '/home/claude', '.game-tester/node_modules/puppeteer-core'),
    '/home/claude/.game-tester/node_modules/puppeteer-core',
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* keep trying */ }
  }
  console.error('puppeteer-core not found. Run setup.sh first.');
  process.exit(2);
}
const puppeteer = resolvePuppeteer();

function findChrome() {
  if (fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")) return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const roots = [
    path.join(process.env.HOME || '/home/claude', '.cache/puppeteer'),
    '/home/claude/.cache/puppeteer',
  ];
  for (const root of roots) {
    for (const flavor of ['chrome-headless-shell', 'chrome']) {
      const dir = path.join(root, flavor);
      if (!fs.existsSync(dir)) continue;
      for (const ver of fs.readdirSync(dir).sort().reverse()) {
        const bins = [
          path.join(dir, ver, 'chrome-headless-shell-linux64/chrome-headless-shell'),
          path.join(dir, ver, 'chrome-linux64/chrome'),
        ];
        for (const b of bins) if (fs.existsSync(b)) return b;
      }
    }
  }
  console.error('No Chrome binary found. Run setup.sh first.');
  process.exit(2);
}

// ---------- args ----------
function parseArgs() {
  const a = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { a[argv[i].slice(2)] = argv[i + 1]; i++; }
  }
  if (!a.target || !a.out) {
    console.error('Required: --target <folder-or-url> --out <dir>');
    process.exit(2);
  }
  a.profile = a.profile || 'both';
  return a;
}

// ---------- tiny static server for local folders ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm', '.ico': 'image/x-icon' };

function serveFolder(folder) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/' || p === '') p = '/index.html';
      const file = path.join(folder, p);
      if (!file.startsWith(path.resolve(folder))) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

// ---------- profiles ----------
const PROFILES = {
  desktop: { width: 1280, height: 720, isMobile: false, hasTouch: false, dsf: 1 },
  mobile:  { width: 390,  height: 844, isMobile: true,  hasTouch: true,  dsf: 2 },
};

// ---------- generic probe plan (used when no actions file is given) ----------
function genericPlan(profile) {
  const pointer = [
    { type: 'wait', ms: 2500, label: 'observe-load' },
    { type: 'click', x: 0.5, y: 0.5, label: 'center-tap-start' },
    { type: 'wait', ms: 1500, label: 'after-start' },
  ];
  const keys = profile === 'mobile' ? [] : [
    { type: 'keys', keys: ['ArrowRight'], holdMs: 1200, label: 'probe-right' },
    { type: 'keys', keys: ['ArrowLeft'],  holdMs: 800,  label: 'probe-left' },
    { type: 'keys', keys: ['ArrowUp'],    holdMs: 400,  label: 'probe-up' },
    { type: 'keys', keys: ['Space'],      holdMs: 250,  label: 'probe-space' },
    { type: 'keys', keys: ['KeyW'],       holdMs: 800,  label: 'probe-w' },
    { type: 'keys', keys: ['KeyD', 'Space'], holdMs: 900, label: 'probe-d-plus-space' },
  ];
  const touch = profile === 'mobile' ? [
    { type: 'drag', from: [0.5, 0.7], to: [0.8, 0.7], ms: 400, label: 'swipe-right' },
    { type: 'drag', from: [0.5, 0.7], to: [0.2, 0.7], ms: 400, label: 'swipe-left' },
    { type: 'click', x: 0.5, y: 0.6, label: 'tap-mid' },
    { type: 'click', x: 0.8, y: 0.85, label: 'tap-bottom-right' },
    { type: 'click', x: 0.2, y: 0.85, label: 'tap-bottom-left' },
  ] : [];
  const stress = [
    { type: 'mash', ms: 2000, label: 'input-mash' },
    { type: 'resize', width: 800, height: 900, label: 'resize-narrow' },
    { type: 'wait', ms: 800, label: 'post-resize' },
    { type: 'resizeRestore', label: 'resize-restore' },
    { type: 'blur', ms: 1500, label: 'tab-blur-focus' },
    { type: 'wait', ms: 4000, label: 'free-play-observe' },
  ];
  return [...pointer, ...keys, ...touch, ...stress];
}

// ---------- instrumentation injected before any game code runs ----------
const INSTRUMENT = `
(() => {
  window.__gt = { fps: [], errors: [], frames: 0, rafSeen: false };
  const origRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { window.__gt.rafSeen = true; window.__gt.frames++; return origRaf(cb); };
  let last = performance.now(), lastFrames = 0;
  setInterval(() => {
    const now = performance.now();
    const fps = Math.round((window.__gt.frames - lastFrames) / ((now - last) / 1000));
    window.__gt.fps.push({ t: Math.round(now), fps });
    last = now; lastFrames = window.__gt.frames;
  }, 1000);
  window.addEventListener('error', e => window.__gt.errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', e => window.__gt.errors.push('unhandledrejection: ' + String(e.reason)));
})();
`;

// ---------- helpers ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
const KEYMAP = k => k; // puppeteer accepts 'ArrowRight', 'Space', 'KeyW' etc.

async function runProfile(browser, url, profileName, plan, outDir, viewportOverride) {
  const p = PROFILES[profileName];
  const page = await browser.newPage();
  const record = {
    profile: profileName, loadMs: null, consoleErrors: [], consoleWarnings: [],
    pageErrors: [], failedRequests: [], dialogs: [], phases: [], fps: [],
    rafSeen: false, notes: [],
  };

  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error') record.consoleErrors.push(msg.text().slice(0, 500));
    else if (t === 'warning') record.consoleWarnings.push(msg.text().slice(0, 300));
  });
  page.on('pageerror', err => record.pageErrors.push(String(err.message || err).slice(0, 500)));
  page.on('requestfailed', req => record.failedRequests.push({ url: req.url().slice(0, 200), reason: (req.failure() || {}).errorText }));
  page.on('dialog', async d => { record.dialogs.push({ type: d.type(), message: d.message().slice(0, 200) }); await d.dismiss().catch(() => {}); });

  await page.setViewport({ width: p.width, height: p.height, isMobile: p.isMobile, hasTouch: p.hasTouch, deviceScaleFactor: p.dsf });
  await page.evaluateOnNewDocument(INSTRUMENT);

  const shotsDir = path.join(outDir, 'shots');
  fs.mkdirSync(shotsDir, { recursive: true });
  let shotIdx = 0;
  const shoot = async (label) => {
    const name = `${profileName}-${String(shotIdx++).padStart(2, '0')}-${label.replace(/[^a-z0-9-]/gi, '_')}.png`;
    try {
      const buf = await page.screenshot({ path: path.join(shotsDir, name) });
      return { name, buf };
    } catch (e) { return { name: null, buf: null }; }
  };

  // --- load ---
  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  } catch (e) {
    record.notes.push('Page load timed out or failed: ' + e.message);
  }
  record.loadMs = Date.now() - t0;
  await sleep(600);
  let prev = await shoot('first-frame');
  record.phases.push({ label: 'first-frame', screenshot: prev.name, frozen: null });

  // --- execute plan ---
  let mashInterval = null;
  for (const step of plan) {
    const label = step.label || step.type;
    try {
      if (step.type === 'click' && step.label === 'start') { if (p.hasTouch) await page.tap('#play'); else await page.click('#play'); await sleep(500); }
      else if (step.type === 'wait') await sleep(step.ms || 1000);
      else if (step.type === 'click') {
        const x = Math.round((step.x <= 1 ? step.x * p.width : step.x));
        const y = Math.round((step.y <= 1 ? step.y * p.height : step.y));
        if (p.hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
        await sleep(step.settleMs || 700);
      }
      else if (step.type === 'keys') {
        for (const k of step.keys) await page.keyboard.down(KEYMAP(k));
        await sleep(step.holdMs || 500);
        for (const k of step.keys) await page.keyboard.up(KEYMAP(k));
        await sleep(300);
      }
      else if (step.type === 'tapKeys') { // discrete presses, e.g. menu navigation
        for (const k of step.keys) { await page.keyboard.press(KEYMAP(k)); await sleep(step.gapMs || 200); }
      }
      else if (step.type === 'drag') {
        const [fx, fy] = step.from.map((v, i) => Math.round(v * (i === 0 ? p.width : p.height)));
        const [tx, ty] = step.to.map((v, i) => Math.round(v * (i === 0 ? p.width : p.height)));
        if (p.hasTouch) {
          await page.touchscreen.touchStart(fx, fy);
          const steps = 8;
          for (let i = 1; i <= steps; i++) {
            await page.touchscreen.touchMove(fx + (tx - fx) * i / steps, fy + (ty - fy) * i / steps);
            await sleep((step.ms || 300) / steps);
          }
          await page.touchscreen.touchEnd();
        } else {
          await page.mouse.move(fx, fy); await page.mouse.down();
          await page.mouse.move(tx, ty, { steps: 10 }); await page.mouse.up();
        }
        await sleep(400);
      }
      else if (step.type === 'mash') {
        const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD'];
        const end = Date.now() + (step.ms || 2000);
        while (Date.now() < end) {
          const k = keys[Math.floor(Math.random() * keys.length)];
          await page.keyboard.press(k).catch(() => {});
          if (p.hasTouch) await page.touchscreen.tap(Math.random() * p.width, Math.random() * p.height).catch(() => {});
          await sleep(60);
        }
      }
      else if (step.type === 'resize') {
        await page.setViewport({ width: step.width, height: step.height, isMobile: p.isMobile, hasTouch: p.hasTouch, deviceScaleFactor: p.dsf });
      }
      else if (step.type === 'resizeRestore') {
        await page.setViewport({ width: p.width, height: p.height, isMobile: p.isMobile, hasTouch: p.hasTouch, deviceScaleFactor: p.dsf });
        await sleep(600);
      }
      else if (step.type === 'blur') {
        await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur')); });
        await sleep(step.ms || 1500);
        await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
        await sleep(500);
      }
    } catch (e) {
      record.notes.push(`Step "${label}" errored: ${e.message}`);
    }
    const shot = await shoot(label);
    const frozen = !!(prev.buf && shot.buf && prev.buf.equals(shot.buf));
    record.phases.push({ label, screenshot: shot.name, frozen });
    if (shot.buf) prev = shot;
  }
  if (mashInterval) clearInterval(mashInterval);

  // --- collect in-page telemetry ---
  try {
    const gt = await page.evaluate(() => window.__gt || null);
    if (gt) {
      record.fps = gt.fps;
      record.rafSeen = gt.rafSeen;
      record.pageErrors.push(...(gt.errors || []).filter(e => !record.pageErrors.includes(e)));
    }
  } catch (e) { record.notes.push('Telemetry collection failed: ' + e.message); }

  // FPS summary
  const fpsVals = record.fps.map(s => s.fps).filter(f => f > 0);
  record.fpsSummary = fpsVals.length ? {
    min: Math.min(...fpsVals), max: Math.max(...fpsVals),
    avg: Math.round(fpsVals.reduce((a, b) => a + b, 0) / fpsVals.length),
    samples: fpsVals.length,
  } : { note: 'no rAF frames observed — game may not be rendering' };

  await page.close();
  return record;
}

// ---------- main ----------
(async () => {
  const args = parseArgs();
  fs.mkdirSync(args.out, { recursive: true });

  let url = args.target, server = null;
  if (!/^https?:\/\//.test(args.target)) {
    const folder = path.resolve(args.target);
    const entry = fs.statSync(folder).isDirectory() ? folder : path.dirname(folder);
    ({ server, url } = await serveFolder(entry));
    if (!fs.statSync(folder).isDirectory()) url += path.basename(folder);
  }

  let plan = null;
  if (args.actions) plan = JSON.parse(fs.readFileSync(args.actions, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
           '--disable-dev-shm-usage', '--mute-audio'],
  });

  const profiles = args.profile === 'both' ? ['desktop', 'mobile'] : [args.profile];
  const session = { target: args.target, label: args.label || null, startedAt: new Date().toISOString(), runs: [] };

  for (const prof of profiles) {
    const profPlan = plan
      ? (Array.isArray(plan) ? plan : (plan[prof] || plan.all || genericPlan(prof)))
      : genericPlan(prof);
    console.log(`[harness] running profile: ${prof} (${profPlan.length} steps)`);
    session.runs.push(await runProfile(browser, url, prof, profPlan, args.out));
  }

  await browser.close();
  if (server) server.close();

  fs.writeFileSync(path.join(args.out, 'session.json'), JSON.stringify(session, null, 2));
  console.log(`[harness] done. Report: ${path.join(args.out, 'session.json')}`);
  console.log(`[harness] screenshots: ${path.join(args.out, 'shots')}`);
})().catch(e => { console.error('[harness] FATAL:', e); process.exit(1); });
