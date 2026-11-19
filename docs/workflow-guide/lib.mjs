// Small Chrome DevTools Protocol helper plus an in-page "balloon" annotator.
// Used by capture.mjs to drive the real app in headless Edge and take
// screenshots with numbered balloons on every clickable / fillable element.
import fs from 'node:fs';
import path from 'node:path';

export const PORT = 9511;
export const ORIGIN = 'http://localhost:5173';
export const W = 1280;
export const H = 800;
export const SCALE = 1.5;

export async function connect() {
  try { const tabs = await (await fetch(`http://localhost:${PORT}/json/list`)).json(); for (const t of tabs) if (t.type === 'page') await fetch(`http://localhost:${PORT}/json/close/${t.id}`); } catch {}
  const tab = await (await fetch(`http://localhost:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  const loadWaiters = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Page.javascriptDialogOpening') {
      console.log('  [native dialog]', m.params.type, m.params.message);
      cdp('Page.handleJavaScriptDialog', { accept: false });
    }
    if (m.method === 'Page.loadEventFired') { while (loadWaiters.length) loadWaiters.shift()(); }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errors.push('EXCEPTION ' + String(d.exception?.description || d.text).split('\n')[0]);
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('console.error ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
    }
  };
  const cdp = (method, params = {}) => new Promise((res) => {
    const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); console.log('  !! CDP timeout', method); res({ result: {} }); } }, 30000);
  });
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: fs.readFileSync(new URL('./inpage.js', import.meta.url), 'utf8') });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ev = async (expr) => {
    const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error('eval failed: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) + '\n' + expr.slice(0, 200));
    return r.result?.result?.value;
  };
  const go = async (p, { wait = 1400 } = {}) => {
    const loaded = new Promise((r) => loadWaiters.push(r));
    await cdp('Page.navigate', { url: ORIGIN + p });
    await Promise.race([loaded, sleep(8000)]);
    await sleep(wait);
  };
  const setSize = (w, h) => cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: SCALE, mobile: w < 700 });
  return { cdp, ev, go, sleep, errors, setSize, close: () => ws.close() };
}

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }
export function writeShot(file, b64) { ensureDir(path.dirname(file)); fs.writeFileSync(file, Buffer.from(b64, 'base64')); }
