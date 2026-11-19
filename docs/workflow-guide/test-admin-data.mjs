// Browser check for Settings > Google connection, Export to Excel, Import from Excel.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { connect } from './lib.mjs';
const require = createRequire(import.meta.url);
const XLSX = require('../../node_modules/xlsx');

const DL = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-dl-'));
const { cdp, ev, go, sleep, errors } = await connect();
const q = JSON.stringify;
await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
const results = [];
const check = (name, ok, detail = '') => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ': ' + detail : '')); };
const diff = (a, b) => { const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]); return [...keys].filter((k) => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])).map((k) => k + ': ' + JSON.stringify(a?.[k]) + ' -> ' + JSON.stringify(b?.[k])).join('; '); };
const same = (a, b) => diff(a, b) === '';
const STORES = ['patients', 'appointments', 'cases', 'prescriptions', 'followups', 'inventory', 'billing'];
const all = (s) => ev(`new Promise(res=>{const r=indexedDB.open('HomeoCareDB'); r.onsuccess=()=>{const d=r.result; const g=d.transaction('${s}').objectStore('${s}').getAll(); g.onsuccess=()=>{d.close();res(g.result)}}})`);
const counts = async () => { const o = {}; for (const s of STORES) o[s] = (await all(s)).length; return o; };
const click = async (t, last = false) => { const ok = await ev(`(function(){const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.trim()===${q(t)}); const e=b[${last ? 'b.length-1' : '0'}]; if(!e) return false; e.click(); return true;})()`); await sleep(900); return ok; };
const setVal = (sel, v) => ev(`(function(){const el=document.querySelector(${q(sel)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${q(v)}); el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const bodyHas = (t) => ev(`document.body.innerText.includes(${q(t)})`);
const waitText = async (t, ms = 20000) => { const s = Date.now(); while (Date.now() - s < ms) { if (await bodyHas(t)) return true; await sleep(400); } return false; };
async function upload(file) {
  const { result } = await cdp('Runtime.evaluate', { expression: `document.querySelector('input[type=file]')` });
  await cdp('DOM.enable');
  await cdp('DOM.setFileInputFiles', { files: [file], objectId: result.result.objectId });
  await sleep(800);
}
async function newestDownload(before) {
  for (let i = 0; i < 30; i++) { const f = fs.readdirSync(DL).filter((x) => x.endsWith('.xlsx') && !before.includes(x)); if (f.length) return path.join(DL, f[0]); await sleep(500); }
  return null;
}

// ---- clean start, sign in ----
await go('/login');
await ev(`new Promise(res=>{localStorage.clear(); const d=indexedDB.deleteDatabase('HomeoCareDB'); d.onsuccess=d.onerror=d.onblocked=()=>res(1);})`);
await go('/login');
// Doctor (jonnet) gets Settings but none of the admin cards.
await setVal('input[autocomplete=username]', 'jonnet'); await setVal('input[autocomplete=current-password]', '123');
await click('Sign in'); await sleep(1200);
check('jonnet signs in as Doctor', JSON.parse(await ev(`localStorage.getItem('auth_user')`)).role === 'Doctor');
await go('/settings');
check('Doctor sees no admin cards', (await ev(`[...document.querySelectorAll('button,input')].filter(b=>['Load Demo Data','Remove Demo Data','Save connection','Export to Excel','Choose Excel file'].includes(b.innerText.trim())||b.id==='appsScriptUrl'||b.type==='file').length`)) === 0 && await bodyHas('available to Admin users only'));
check('Doctor can still open clinic modules', (await go('/cases'), !(await bodyHas('Access Denied'))));
await ev(`localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user')`);
await go('/login');
await setVal('input[autocomplete=username]', 'admin'); await setVal('input[autocomplete=current-password]', 'jonnet-password-wont-work');
await click('Sign in'); await sleep(800);
check('admin with wrong password rejected', await bodyHas('Invalid credentials'));
await setVal('input[autocomplete=current-password]', 'password');
await click('Sign in'); await sleep(1200);
check('admin signs in as Admin', JSON.parse(await ev(`localStorage.getItem('auth_user')`)).role === 'Admin');
check('Stored user has no password', !(await ev(`localStorage.getItem('auth_user')`)).includes('password'));

// ---- Google connection ----
await go('/settings');
check('Admin sees all four cards', (await bodyHas('Load Demo Data')) && (await bodyHas('Google connection')) && (await bodyHas('Export to Excel')) && (await bodyHas('Import from Excel')));
await setVal('#appsScriptUrl', 'http://example.com/x'); await setVal('#sheetsUrl', 'not a url');
await click('Save connection');
check('Invalid URLs rejected', (await bodyHas('An Apps Script web-app address starts with https://script.google.com/') || await bodyHas('The address must start with https://')) && await bodyHas('Enter a full web address starting with https://'));
check('Nothing saved when invalid', (await ev(`localStorage.getItem('homeocare_google_config')`)) === null);
await setVal('#appsScriptUrl', 'https://script.google.com/macros/s/ABC123/exec/'); await setVal('#sheetsUrl', 'https://sheets.example.com/api');
await click('Save connection');
const saved = JSON.parse(await ev(`localStorage.getItem('homeocare_google_config')`) || '{}');
check('Valid URLs saved (trailing slash trimmed)', saved.appsScriptUrl === 'https://script.google.com/macros/s/ABC123/exec' && saved.sheetsUrl === 'https://sheets.example.com/api', JSON.stringify(saved));
check('Saved message', await bodyHas('Connection saved.'));
await go('/settings');
check('URLs shown again after reload', (await ev(`document.querySelector('#appsScriptUrl').value`)) === 'https://script.google.com/macros/s/ABC123/exec');
// Clear them so the rest of the test runs offline (no real backend).
await setVal('#appsScriptUrl', ''); await setVal('#sheetsUrl', ''); await click('Save connection');
check('Empty = offline only', await bodyHas('app works offline only'));

// ---- Export ----
await click('Load Demo Data'); await click('Load Demo Data', true);
await waitText('Demo data added', 60000);
const before = await counts();
const pBefore = (await all('patients')).find((p) => p.fullName === 'Ravi Kumar');
const cBefore = (await all('cases'))[0];
let had = fs.readdirSync(DL);
await click('Export to Excel');
const file = await newestDownload(had);
check('Export downloaded a file', !!file, file || '');
check('Export message', await waitText('Export downloaded.'));
const wb = XLSX.readFile(file);
check('Workbook has About + 7 data sheets', ['About', 'Patients', 'Appointments', 'Cases', 'Prescriptions', 'Follow-ups', 'Inventory', 'Billing'].every((s) => wb.SheetNames.includes(s)), wb.SheetNames.join(','));
const pRows = XLSX.utils.sheet_to_json(wb.Sheets.Patients);
check('Patients sheet has 20 rows, id first', pRows.length === 20 && Object.keys(pRows[0])[0] === 'id', `${pRows.length} rows, first col ${Object.keys(pRows[0])[0]}`);

// ---- Remove demo data, then import the export back ----
await click('Remove Demo Data'); await click('Remove Demo Data', true);
await waitText('Demo data removed');
check('Data removed before import', (await counts()).patients === 0);
await upload(file);
check('Import confirmation shown', await bodyHas('Records with the same id are overwritten'));
await click('Import', true);
await waitText('Import finished.');
const after = await counts();
check('Import restored every record', STORES.every((s) => after[s] === before[s]), JSON.stringify(after));
const pAfter = (await all('patients')).find((p) => p.id === pBefore.id);
const cAfter = (await all('cases')).find((c) => c.id === cBefore.id);
check('Patient fields identical (mobile text, age number, emergency contact object)', same(pBefore, pAfter), diff(pBefore, pAfter) || `mobile=${typeof pAfter?.mobile} age=${typeof pAfter?.age} ec=${typeof pAfter?.emergencyContact}`);
check('Case nested lists identical', same(cBefore, cAfter), diff(cBefore, cAfter));
await go('/patients');
check('Patient list shows imported patients', await waitText('20 registered patients'));

// ---- Import merges: edit one row, add one, break one ----
const rows = pRows.map((r) => ({ ...r }));
rows[0].occupation = 'Changed In Excel';
rows.push({ id: 'imported-1', patientId: 'P000099', fullName: 'Excel Added', mobile: 9123456789, gender: 'Male' });
rows.push({ fullName: 'No Id Row', mobile: '9000000000' });
const wb2 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb2, XLSX.utils.json_to_sheet(rows), 'Patients');
const edited = path.join(DL, 'edited.xlsx'); XLSX.writeFile(wb2, edited);
await go('/settings');
await upload(edited); await click('Import', true);
await waitText('Import finished.');
const pAll = await all('patients');
check('Edited row updated', pAll.find((p) => p.id === rows[0].id)?.occupation === 'Changed In Excel');
const added = pAll.find((p) => p.id === 'imported-1');
check('New row added, number mobile kept as text', added && added.mobile === '9123456789', JSON.stringify(added));
check('Row without id skipped and reported', pAll.length === 21 && await bodyHas('Patients row 23: missing id'), `patients=${pAll.length}`);
check('Other sheets untouched', (await counts()).cases === before.cases);

// ---- Bad files ----
const txt = path.join(DL, 'notes.txt'); fs.writeFileSync(txt, 'hello');
await upload(txt); await click('Import', true);
check('Non-Excel file rejected', await waitText('Please choose an Excel file'));
const wb3 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb3, XLSX.utils.aoa_to_sheet([['a'], [1]]), 'Random');
const other = path.join(DL, 'other.xlsx'); XLSX.writeFile(wb3, other);
await upload(other); await click('Import', true);
check('Workbook without clinic sheets rejected', await waitText('No HomeoCare Pro sheets found'));
check('Bad files changed nothing', (await counts()).patients === 21);
// Prototype-pollution attempt in a JSON cell is dropped.
const wb4 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb4, XLSX.utils.json_to_sheet([{ id: 'evil-1', fullName: 'Evil', mobile: '9000000002', emergencyContact: '{"name":"x","__proto__":{"polluted":true}}' }]), 'Patients');
const evil = path.join(DL, 'evil.xlsx'); XLSX.writeFile(wb4, evil);
await upload(evil); await click('Import', true); await waitText('Import finished.');
check('No prototype pollution', (await ev(`({}).polluted === undefined`)) && (await all('patients')).find((p) => p.id === 'evil-1')?.emergencyContact?.name === 'x');

// ---- Cancel import does nothing ----
await upload(file);
await click('Cancel', true);
check('Cancel import changes nothing', (await counts()).patients === 22);

console.log('console errors:', [...new Set(errors)].length, [...new Set(errors)].join(' || '));
console.log(`${results.filter(Boolean).length} passed, ${results.filter((x) => !x).length} failed`);
fs.rmSync(DL, { recursive: true, force: true });
process.exit(0);
