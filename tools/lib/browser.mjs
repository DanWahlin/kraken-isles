// Shared plumbing for the Node tools: flag parsing, launching Chrome on the real GPU, and collecting a
// page's console errors so each script can report them in its JSON output.
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';

/**
 * Parses `--key=value` and bare `--flag` arguments (a bare flag is `true`). Values keep any `=` they
 * contain, so `--eval="a=b"` works.
 */
export function parseFlags(argv = process.argv.slice(2)) {
  return Object.fromEntries(
    argv.map((a) => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.length ? v.join('=') : true];
    }),
  );
}

/** `'1600x900'` → `{ width: 1600, height: 900 }`, falling back per axis. */
export function parseSize(s, fallback = { width: 1600, height: 900 }) {
  const [width, height] = String(s).split('x').map(Number);
  return { width: width || fallback.width, height: height || fallback.height };
}

/** Chrome flags for the real GPU: ANGLE on Metal, no blocklist, and WebGPU on. */
export const GPU_ARGS = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'];
export const UNCAPPED_GPU_ARGS = ['--disable-frame-rate-limit', '--disable-gpu-vsync'];

/**
 * Launches the installed Chrome. `gpu` adds the real-GPU flags, and `autoplay` lets audio start without
 * a gesture (for flows that unlock sound).
 */
export function launchChrome({ gpu = true, autoplay = false, uncapped = false } = {}) {
  const args = gpu ? [...GPU_ARGS] : [];
  if (gpu && uncapped) args.push(...UNCAPPED_GPU_ARGS);
  if (autoplay) args.push('--autoplay-policy=no-user-gesture-required');
  return chromium.launch({ channel: 'chrome', ...(args.length ? { args } : {}) });
}

/**
 * Pushes the page's console messages of the given `types` (as `[type] text`) and uncaught page errors
 * (as `[pageerror] message`) into `logs`, and returns it.
 */
export function collectLogs(page, { types = ['error', 'warning'], logs = [] } = {}) {
  page.on('console', (m) => {
    if (types.includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  return logs;
}

/**
 * Waits for the game's title screen with the splash gone (it holds for a moment even on a fast load, so
 * `screen === 'title'` alone can still show it). Returns `Date.now()` from when the title was reached.
 */
export async function waitForTitle(page, timeout = 120_000) {
  await page.waitForFunction(() => window.__flow?.getState().screen === 'title', null, { timeout });
  const reachedAt = Date.now();
  await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 15_000 });
  return reachedAt;
}

/**
 * Shows the page live in a web page: open `http://localhost:<port>` to watch a script play the game
 * (the page's frames by CDP screencast, sent as motion JPEG; no sound). Returns the stop function.
 */
export async function watchPage(page, port = 5390) {
  const cdp = await page.context().newCDPSession(page);
  const viewers = new Set();
  let last = null;
  const send = (res, jpeg) =>
    res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`) &&
    res.write(jpeg) &&
    res.write('\r\n');
  cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    last = Buffer.from(data, 'base64');
    for (const res of viewers) send(res, last);
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 72, maxWidth: 1280, maxHeight: 720 });
  const server = createServer((req, res) => {
    if (req.url !== '/stream') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<!doctype html><title>Kraken Isles · live play-through</title>' +
          '<body style="margin:0;background:#06121b;display:grid;place-items:center;height:100vh">' +
          '<img src="/stream" alt="The game, as the script plays it" style="max-width:100vw;max-height:100vh">',
      );
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
      'Cache-Control': 'no-store',
    });
    viewers.add(res);
    if (last) send(res, last);
    req.on('close', () => viewers.delete(res));
  });
  await new Promise((done) => server.listen(port, '127.0.0.1', done));
  return () => {
    for (const res of viewers) res.end();
    server.close();
    server.closeAllConnections();
    void cdp.send('Page.stopScreencast').catch(() => {});
  };
}
