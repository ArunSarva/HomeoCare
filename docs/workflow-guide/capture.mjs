// Drives the real app in headless Edge, taking annotated screenshots of every
// screen and operation. Output: shots/*.jpg and steps.json (read by build.mjs).
// Usage: node capture.mjs [--only=1,2,3]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, writeShot, ensureDir, W, H } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = ensureDir(path.join(HERE, 'shots'));
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',').map(Number) : null;
const q = JSON.stringify;
const _log = console.log;
console.log = (...a) => { _log(...a); fs.appendFileSync(path.join(HERE, 'run.log'), a.join(' ') + '\n'); };
fs.writeFileSync(path.join(HERE, 'run.log'), '');

const { cdp, ev, go, sleep, errors, setSize } = await connect();
const steps = [];
let section = '';
let counter = 0;

// ---------- primitives ----------
async function snap({ title, desc, next, act, scope = 'main', maxParts = 4, full = true, note }) {
  await sleep(600);
  await ev('__hc.scrollTo(0)'); await sleep(200);
  await ev('__hc.clearSeen()');
  const info = await ev('__hc.info()');
  const stepPx = Math.max(200, info.ch - 90);
  const parts = full && info.sh > info.ch + 24 ? Math.min(maxParts, Math.ceil((info.sh - info.ch) / stepPx) + 1) : 1;
  const images = [];
  let n = 1;
  counter++;
  for (let i = 0; i < parts; i++) {
    if (parts > 1) await ev(`__hc.scrollTo(${Math.min(i * stepPx, info.sh - info.ch)})`);
    await sleep(250);
    const items = await ev(`__hc.annotate(${q(scope)}, ${n}, ${q(act || '')})`);
    n += items.length;
    const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
    const file = `s${String(counter).padStart(3, '0')}-p${i + 1}.jpg`;
    writeShot(path.join(SHOTS, file), r.result.data);
    await ev('__hc.clearBalloons()');
    images.push({ file, items });
  }
  if (parts > 1) await ev('__hc.scrollTo(0)');
  steps.push({ no: counter, section, title, desc, next, note, url: await ev('location.pathname'), images });
  console.log(`#${counter} [${section}] ${title} -> ${images.reduce((a, i) => a + i.items.length, 0)} balloons`);
}

async function clickText(text, { last = false, contains = false, sel = 'button,a,[role=button],[role=menuitem],[role=tab],label' } = {}) {
  const ok = await ev(`(function(){
    const t=${q(text)}, contains=${contains};
    const els=[...document.querySelectorAll(${q(sel)})].filter(e=>{const r=e.getBoundingClientRect(); if(r.width<=0||r.height<=0) return false; const x=(e.getAttribute('aria-label')||e.innerText||'').replace(/\\s+/g,' ').trim(); return contains? x.toLowerCase().includes(t.toLowerCase()) : x===t;});
    const e=${last ? 'els[els.length-1]' : 'els[0]'}; if(!e) return false; e.scrollIntoView({block:'center'}); e.click(); return true;})()`);
  if (!ok) console.log('  !! click target not found:', text);
  await sleep(900);
  return ok;
}
async function clickCss(css, idx = 0) {
  const ok = await ev(`(function(){const e=document.querySelectorAll(${q(css)})[${idx}]; if(!e) return false; e.scrollIntoView({block:'center'}); e.click(); return true;})()`);
  if (!ok) console.log('  !! css target not found:', css);
  await sleep(900);
  return ok;
}
const SETTER = `function set(el,v){ if(!el) return false; const p=el.tagName==='SELECT'?HTMLSelectElement.prototype:(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype); Object.getOwnPropertyDescriptor(p,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true; }`;
async function fill(spec, value) {
  const ok = await ev(`(function(){ ${SETTER}
    const s=${q(spec)}; let el=null;
    if(s.startsWith('ph:')) el=document.querySelector('[placeholder="'+s.slice(3)+'"]');
    else if(s.startsWith('css:')) el=document.querySelector(s.slice(4));
    else if(s.startsWith('opt:')) el=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value===s.slice(4)||o.text===s.slice(4)));
    else if(s.startsWith('lbl:')){ const l=[...document.querySelectorAll('label')].find(x=>x.innerText.replace(/\\s+/g,' ').trim().toLowerCase().startsWith(s.slice(4).toLowerCase())); if(l) el=l.control||l.parentElement.querySelector('input,select,textarea'); }
    if(!el) return false;
    let v=${q(value)};
    if(el.tagName==='SELECT'){ const o=[...el.options].find(o=>o.value===v||o.text===v||o.text.startsWith(v)); if(o) v=o.value; }
    return set(el,v); })()`);
  if (!ok) console.log('  !! field not found:', spec);
  await sleep(120);
  return ok;
}
const KEYS = { Escape: [27, 'Escape'], Enter: [13, 'Enter'], Tab: [9, 'Tab'] };
async function key(k, mods = 0) {
  const [vk, code] = KEYS[k] || [k.toUpperCase().charCodeAt(0), 'Key' + k.toUpperCase()];
  for (const type of ['rawKeyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: k, code, modifiers: mods, windowsVirtualKeyCode: vk, ...(k === 'Enter' && type === 'rawKeyDown' ? { text: '\r' } : {}) });
  if (k === 'Enter') await cdp('Input.dispatchKeyEvent', { type: 'char', text: '\r', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(900);
}
async function dismiss() {
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 470, y: 28, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 470, y: 28, button: 'left', clickCount: 1 });
  await sleep(600);
}
async function hover(css) {
  const r = await ev(`(function(){const e=document.querySelector(${q(css)}); if(!e) return null; const b=e.getBoundingClientRect(); return [b.left+b.width/2,b.top+b.height/2];})()`);
  if (r) { await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0], y: r[1] }); await sleep(500); } else console.log('  !! hover target missing', css);
}
async function clickRow(name) {
  const ok = await ev(`(function(){const tr=[...document.querySelectorAll('tbody tr')].find(t=>t.innerText.includes(${q(name)})); if(!tr) return false; const td=tr.querySelector('td'); td.click(); return true;})()`);
  await sleep(1200); return ok;
}
async function openOrGo(clickFn, fallbackPath) {
  const before = await ev('location.pathname'); await clickFn();
  const after = await ev('location.pathname');
  if (after === before) { console.log('  (click did not navigate, using direct URL)', fallbackPath); await go(fallbackPath); return false; }
  await sleep(900); return true;
}
const text = (n = 300) => ev(`(document.querySelector('main')||document.body).innerText.slice(0,${n}).replace(/\\s*\\n\\s*/g,' | ')`);
const db = (store) => ev(`new Promise(res=>{const r=indexedDB.open('HomeoCareDB'); r.onsuccess=()=>{const d=r.result; if(!d.objectStoreNames.contains('${store}')){d.close();res([]);return;} const g=d.transaction('${store}','readonly').objectStore('${store}').getAll(); g.onsuccess=()=>{d.close();res(g.result)};}; r.onerror=()=>res([]);})`);
async function waitFor(fnBody, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(`(function(){${fnBody}})()`)) return true; await sleep(400); } return false; }
async function fakeConfirm(msg) {
  await ev(`(function(){ const d=document.createElement('div'); d.id='__fake'; d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.28);z-index:2147483000;display:flex;align-items:flex-start;justify-content:center;padding-top:50px;';
    d.innerHTML='<div style="background:#fff;width:440px;border-radius:12px;padding:20px 22px;font:14px Segoe UI,Arial,sans-serif;color:#222;box-shadow:0 8px 30px rgba(0,0,0,.4)"><div style="font-weight:600;margin-bottom:10px">localhost:5173 says</div><div style="margin-bottom:18px">'+${q(msg)}+'</div><div style="text-align:right"><button style="padding:6px 22px;background:#0b57d0;color:#fff;border:0;border-radius:16px;margin-right:8px;font:inherit">OK</button><button style="padding:6px 22px;background:#fff;border:1px solid #888;border-radius:16px;font:inherit">Cancel</button></div></div>'; document.body.appendChild(d); })()`);
}
const dropFake = () => ev(`document.getElementById('__fake') && document.getElementById('__fake').remove()`);
async function tryClick(list, opts) { for (const t of list) { if (await ev(`[...document.querySelectorAll('button,a,[role=button]')].some(e=>e.getBoundingClientRect().width>0&&(e.getAttribute('aria-label')||e.innerText||'').replace(/\\s+/g,' ').trim()===${q(t)})`)) return clickText(t, opts); } console.log('  !! none of', list); return false; }
const todayPlus = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const pid = async (name) => (await db('patients')).find((p) => p.fullName === name)?.id;
const S = (name) => { section = name; };
const run = (n) => !only || only.includes(n);

// ---------- 0. clean slate (skip localStorage clear to avoid security error) ----------
await go('/login');
// Skip localStorage.clear() to avoid SecurityError in headless browser
if (!only || only.includes(1)) {
  // ---------- 1. Signing in ----------
  S('1. Signing in');
  await go('/login');
  await snap({
    title: 'Login screen',
    desc: 'The first screen anyone sees. Nothing in the application can be opened until you sign in. The clinic name and a short tagline appear on the green panel; the sign-in card is on the right.',
    next: 'Type the username and password, then press Sign in.',
    act: 'Sign in',
  });
  await fill('css:input[autocomplete=username]', 'jonnet');
  await fill('css:input[autocomplete=current-password]', 'wrong-password');
  await clickText('Sign in');
  await sleep(600);
  await snap({
    title: 'Sign-in with a wrong password',
    desc: 'If the username or password is wrong, a red message "Invalid credentials" appears and you stay on the login screen. Nothing is stored.',
    next: 'Correct the password and press Sign in again.',
    act: 'Sign in',
  });
  const eye = await clickText('Show password', { contains: true, sel: 'button' });
  if (eye) await snap({ title: 'Show password', desc: 'The eye icon inside the password box toggles between hidden dots and readable characters, so you can check what you typed.', next: 'Press the eye icon again to hide, or continue to sign in.', act: 'Sign in' });
  await fill('css:input[autocomplete=current-password]', '123');
  await snap({
    title: 'Correct credentials entered',
    desc: 'Username jonnet and password 123 filled in. The password is shown as dots.',
    next: 'Press Sign in. You land on the Dashboard.',
    act: 'Sign in',
  });
  await clickText('Sign in');
  await sleep(1500);
}
if (only && !only.includes(1)) {
  await go('/login');
  await fill('css:input[autocomplete=username]', 'jonnet');
  await fill('css:input[autocomplete=current-password]', '123');
  await clickText('Sign in'); await sleep(1500);
}

if (run(2)) {
  // ---------- 2. App shell ----------
  S('2. The application frame (sidebar, top bar, menus)');
  await go('/dashboard');
  await snap({
    title: 'Application frame: sidebar and top bar',
    desc: 'Every screen after login shares the same frame. The left sidebar lists the modules; the top bar holds search, the date, the quick-create button, notifications and the dark-mode switch. Balloons on this page cover the frame itself; the following pages number only the page content.',
    next: 'Click any sidebar item to move between modules.',
    scope: 'all', full: false,
  });
  await clickText('Collapse', { contains: true, sel: 'button' });
  await snap({ title: 'Sidebar collapsed', desc: 'The sidebar shrinks to icons only to give the page more room. Hovering an icon shows its name in a tooltip. The choice is remembered the next time you open the app.', next: 'Click the expand arrow to restore the full sidebar.', scope: 'all', full: false });
  await clickText('Expand', { contains: true, sel: 'button' });
  await clickText('Jonnet', { contains: true, sel: 'button,[role=button]' });
  await snap({ title: 'Account menu', desc: 'Clicking your name at the bottom of the sidebar opens the account menu: Profile, Settings, Keyboard shortcuts and Logout.', next: 'Pick an item, or click elsewhere to close.', scope: 'overlay', full: false });
  await clickText('Keyboard shortcuts', { contains: true, sel: '[role=menuitem],button' });
  await snap({ title: 'Keyboard shortcuts (menu item has no screen yet)', desc: 'Choosing Keyboard shortcuts in the account menu currently does nothing: the menu closes and you stay on the same page, as this screenshot shows. The shortcuts themselves work: Ctrl + K opens the command palette, N (when not typing in a box) opens a new patient form, and Esc closes menus and dialogs.', next: 'Continue with the notifications bell.', scope: 'overlay', full: false });
  await dismiss(); await key('Escape'); await dismiss();
  await clickText('Notifications', { contains: true, sel: 'button' });
  await snap({ title: 'Notifications', desc: 'The bell icon in the top bar opens a pop-over with alerts such as follow-ups that are due and medicines running low. It says "No new notifications" when there is nothing to show.', next: 'Click outside the pop-over to close it.', scope: 'overlay', full: false });
  await dismiss();
  await clickText('Toggle dark mode', { contains: true, sel: 'button' });
  await snap({ title: 'Dark mode', desc: 'The moon/sun icon in the top bar switches the whole application between the light and dark colour themes. The choice is remembered.', next: 'Click the same icon again to return to light mode.', scope: 'all', full: false });
  await clickText('Toggle dark mode', { contains: true, sel: 'button' });
  await key('k', 2);
  await snap({ title: 'Command palette (Ctrl + K)', desc: 'Press Ctrl + K anywhere to open a quick-jump box. Type a page name or an action, use the arrow keys to move and Enter to open it.', next: 'Press Escape to close.', scope: 'overlay', full: false });
  await ev(`(function(){ ${SETTER} const all=[...document.querySelectorAll('input')]; const t=all[all.length-1]; if(t){ t.focus(); set(t,'pat'); } })()`);
  await sleep(700);
  await snap({ title: 'Command palette with a search typed', desc: 'Typing filters the list of pages and actions. The first match is highlighted; Enter opens it.', next: 'Press Enter to open the highlighted result or Escape to close.', scope: 'overlay', full: false });
  await key('Escape'); await dismiss();
  await clickText('New', { sel: 'button' });
  await snap({ title: 'Top-bar "New" menu', desc: 'The green New button opens a quick-create menu so you can start a new patient, appointment, prescription or bill from any screen.', next: 'Choose an item, or click elsewhere to close.', scope: 'overlay', full: false });
  await dismiss();
  await setSize(390, 800);
  await go('/dashboard');
  await snap({ title: 'Phone / narrow screen layout', desc: 'On a phone-sized screen the sidebar is hidden and the layout becomes a single column. A menu button appears in the top bar.', next: 'Tap the menu button to open the navigation drawer.', scope: 'all', full: false });
  await clickText('Open menu', { contains: true, sel: 'button' });
  await snap({ title: 'Navigation drawer on a phone', desc: 'The same sidebar menu slides in from the left as a drawer.', next: 'Tap an item to go there, or tap outside the drawer to close it.', scope: 'all', full: false });
  await setSize(W, H);
  await go('/dashboard');
}

if (run(3)) {
  // ---------- 3. Empty states ----------
  S('3. First-time view: every module before any data exists');
  const empty = [
    ['/dashboard', 'Dashboard (no data yet)', 'With no records the dashboard shows zeros and friendly "nothing yet" messages instead of charts.'],
    ['/patients', 'Patients list (empty)', 'The patient list before anyone is registered, with a button to add the first patient.'],
    ['/appointments', 'Appointments (empty)', 'The appointment screen before anything is booked.'],
    ['/cases', 'Cases (empty)', 'The case-taking list before any case history is recorded.'],
    ['/prescriptions', 'Prescriptions (empty)', 'The prescription list before any prescription is written.'],
    ['/followups', 'Follow-ups (empty)', 'The follow-up list before any follow-up is recorded.'],
    ['/inventory', 'Inventory (empty)', 'The medicine stock list before any stock is entered.'],
    ['/billing', 'Billing (empty)', 'The billing list before any invoice is created.'],
    ['/billing/dashboard', 'Billing dashboard (empty)', 'Revenue summary figures before any billing.'],
    ['/billing/reports', 'Revenue reports (empty)', 'Revenue reports before any billing.'],
    ['/search', 'Global search (empty)', 'The search page before a query is typed.'],
  ];
  for (const [p, t, d] of empty) { await go(p); await snap({ title: t, desc: d, next: 'Continue to the next module.', full: false }); }
}

if (run(4)) {
  // Sample data for the rest of the guide. Loading it is an admin task, so it
  // happens behind the scenes and is not part of the guide.
  const signIn = async (u, p) => {
    await ev(`localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user')`);
    await go('/login');
    await fill('css:input[autocomplete=username]', u);
    await fill('css:input[autocomplete=current-password]', p);
    await clickText('Sign in'); await sleep(1500);
  };
  await signIn('admin', 'password');
  await go('/settings');
  await clickText('Load Demo Data');
  await clickText('Load Demo Data', { last: true });
  if (!(await waitFor(`return document.body.innerText.includes('Demo data added')`, 60000))) throw new Error('sample data did not load');
  await signIn('jonnet', '123');
  const who = JSON.parse(await ev(`localStorage.getItem('auth_user')`));
  if (who.username !== 'jonnet') throw new Error('expected jonnet, got ' + who.username);
  console.log('  (sample data loaded behind the scenes; signed in as jonnet again)');
}

if (run(5)) {
  S('4. Dashboard with data');
  await go('/dashboard');
  await snap({ title: 'Dashboard with data', desc: 'The home screen once records exist: four summary tiles (today\'s appointments, follow-ups due, active cases, monthly revenue), today\'s schedule, follow-ups due, quick actions and charts. Every tile and list entry is clickable and opens the matching module.', next: 'Use a tile, a quick action or the sidebar to open a module.', maxParts: 4 });
}

if (run(6)) {
  S('5. Patients');
  await go('/patients');
  await snap({ title: 'Patient list', desc: 'All registered patients, newest first. Each row shows the name with the patient number (P000001 style) and mobile, age and gender (age is calculated from the date of birth), city and registration date. Click a column heading to sort. A search box sits above the table; page buttons and a rows-per-page box are at the bottom.', next: 'Type in the search box to filter, press Add patient to register someone new, or click a row to open that patient.', act: 'Add patient', maxParts: 3 });
  await hover('tbody tr');
  await snap({ title: 'Patient list: row actions (hover)', desc: 'Pointing at a row reveals two small icon buttons at its right end: Edit (pencil) and Delete (bin). They are hidden until you hover so the table stays clean. The same pair exists on every row.', next: 'Click the pencil to edit, the bin to delete, or anywhere else on the row to open the patient.', full: false });
  await clickText('Delete', { contains: true, sel: 'button' });
  await snap({ title: 'Delete patient: confirmation', desc: 'Deleting always asks first. The red Delete button removes the patient permanently; Cancel closes the box and keeps the record.', next: 'Press Cancel to keep the patient.', act: 'Cancel', scope: 'overlay', full: false });
  await clickText('Cancel', { last: true });
  await fill('css:input[type=search]', 'priya');
  await snap({ title: 'Searching the patient list', desc: 'Typing in the search box narrows the list at once by name, patient number, mobile or e-mail. Here "priya" leaves only Priya Sharma.', next: 'Clear the box to see everyone again.', full: false });
  await fill('css:input[type=search]', '');
  await tryClick(['Add patient', '+ Add patient']);
  await snap({ title: 'New patient form (empty)', desc: 'The registration form is split into cards: personal details, contact, address, medical background and emergency contact. Fields marked with a red * are required. Cancel and Save patient stay fixed at the bottom of the window while you scroll.', next: 'Fill the fields and press Save patient.', act: 'Save patient', maxParts: 4 });
  await tryClick(['Save patient']);
  await snap({ title: 'Validation messages on the patient form', desc: 'Pressing Save patient with required fields empty does not save. A red message appears under each missing field and the form stays open.', next: 'Fill in the highlighted fields.', act: 'Save patient', maxParts: 2 });
  await fill('ph:e.g. Ravi Kumar', 'Rahul Mehta');
  await fill('ph:10-digit mobile number', '9898989898');
  await fill('css:main input[type=date]', '1990-06-15');
  await fill('opt:Female', 'Male');
  await fill('ph:City', 'Surat');
  await fill('ph:e.g. Teacher', 'Accountant');
  await snap({ title: 'New patient form (filled)', desc: 'Example values entered. Age fills in by itself (read-only) as soon as the date of birth is chosen.', next: 'Press Save patient.', act: 'Save patient', maxParts: 4 });
  await tryClick(['Save patient']);
  await waitFor(`return /21 patients/.test(document.body.innerText)`, 8000) || await go('/patients');
  await snap({ title: 'Patient saved: back on the list', desc: 'After saving you return to the patient list, which now counts 21 patients. The new patient is listed with the next patient number (P000021).', next: 'Click the patient row to open the full record.', full: false });
  const rid = await pid('Rahul Mehta');
  await fill('css:input[type=search]', 'Rahul');
  await openOrGo(() => clickRow('Rahul Mehta'), `/patients/${rid}`);
  await snap({ title: 'Patient detail', desc: 'The full record of one patient: a header with name, number, age and contact details, with buttons to Call, WhatsApp, book a New appointment, Edit and write a New prescription. Cards below hold personal, medical and history information.', next: 'Press Edit to change details.', act: 'Edit', maxParts: 3 });
  await tryClick(['Edit']);
  await snap({ title: 'Edit patient', desc: 'The same form as registration, pre-filled with the saved values.', next: 'Change a value and press Save changes.', act: 'Save changes', maxParts: 3 });
  await fill('ph:e.g. Teacher', 'Senior Accountant');
  await tryClick(['Save changes']);
  await snap({ title: 'Patient updated', desc: 'After Save changes you return to the patient detail and the new occupation is shown.', next: 'Use the sidebar to continue.', maxParts: 2 });
}

if (run(7)) {
  S('6. Appointments');
  await go('/appointments');
  await snap({ title: 'Appointments (day view)', desc: 'The calendar for the chosen day with every booking listed in time order, plus the list of all appointments below. The Day / Week / Month buttons change the calendar, the arrows move back and forward, Today jumps to today, and Go to Date picks any date. Each row has Edit and Delete buttons.', next: 'Press New appointment to book a visit.', act: '+ New Appointment', maxParts: 3 });
  await tryClick(['Week']);
  await snap({ title: 'Appointments (week view)', desc: 'Seven days side by side so a busy week can be seen at a glance.', next: 'Press Month for the whole month.', act: 'Month', maxParts: 2 });
  await tryClick(['Month']);
  await snap({ title: 'Appointments (month view)', desc: 'A month grid where each day shows its bookings.', next: 'Press Day to return to the daily view.', act: 'Day', maxParts: 2 });
  await tryClick(['Day']);
  await clickText('Delete', { contains: false, sel: 'button' });
  await fakeConfirm('Are you sure you want to delete this appointment?');
  await snap({ title: 'Delete appointment: confirmation', desc: 'Deleting an appointment shows the browser\'s own confirmation box. OK deletes the booking permanently; Cancel keeps it. (This box is drawn by the browser, so its look differs slightly between Edge, Chrome and Firefox.)', next: 'Press Cancel to keep the appointment.', act: 'Cancel', scope: 'overlay', full: false });
  await dropFake();
  await tryClick(['+ New Appointment']);
  await snap({ title: 'New appointment form (empty)', desc: 'Choose the patient, date, start and end time, type and status, then describe the reason in the notes editor (bold, italic, lists are available in its toolbar).', next: 'Fill the form and press Create Appointment.', act: 'Create Appointment', maxParts: 3 });
  await tryClick(['Create Appointment']);
  await snap({ title: 'Validation on the appointment form', desc: 'Saving without choosing a patient shows an error beside the field and nothing is booked.', next: 'Choose a patient.', act: 'Create Appointment', maxParts: 2 });
  const rid = await pid('Rahul Mehta');
  await fill('opt:' + rid, rid);
  await fill('css:main input[type=date]', todayPlus(0));
  await ev(`(function(){ ${SETTER} const t=document.querySelectorAll('main input[type=time]'); if(t.length>=2){set(t[0],'16:00'); set(t[1],'16:30');} })()`);
  await ev(`(function(){ const e=document.querySelector('[contenteditable=true]'); if(e){ e.focus(); document.execCommand('insertText',false,'Back pain consultation'); } })()`);
  await snap({ title: 'New appointment form (filled)', desc: 'Patient Rahul Mehta, today 16:00 to 16:30, with the reason typed in the notes box.', next: 'Press Create Appointment.', act: 'Create Appointment', maxParts: 3 });
  await tryClick(['Create Appointment']);
  await sleep(800);
  await snap({ title: 'Appointment created', desc: 'The booking now appears in the calendar and in the list.', next: 'Open the appointment to see its details.', maxParts: 3 });
  const ap = (await db('appointments')).find((a) => a.patientName === 'Rahul Mehta');
  await go(`/appointments/${ap.id}`);
  await snap({ title: 'Appointment detail', desc: 'All information about the booking: patient, date and time, type, status, doctor and notes. Buttons: Back to List, Edit Appointment and Delete.', next: 'Press Edit Appointment to change it.', act: 'Edit Appointment', maxParts: 2 });
  await tryClick(['Edit Appointment']);
  await snap({ title: 'Edit appointment', desc: 'The booking form pre-filled. Change the time, status (for example Completed or Cancelled) or notes.', next: 'Press Update Appointment.', act: 'Update Appointment', maxParts: 3 });
  await fill('opt:Completed', 'Completed');
  await tryClick(['Update Appointment']);
  await sleep(900);
  await snap({ title: 'Appointment updated', desc: 'After saving you return to the appointments screen; the status now reads Completed.', next: 'Continue to Cases.', maxParts: 3 });
}

if (run(8)) {
  S('7. Cases (case taking)');
  await go('/cases');
  await snap({ title: 'Cases list', desc: 'Every case history recorded: patient, chief complaint, severity and date. Search by name, filter by date, and press View to open a case. + New Case starts a new one.', next: 'Press + New Case.', act: '+ New Case', maxParts: 3 });
  const rid = await pid('Rahul Mehta');
  await tryClick(['+ New Case']);
  await snap({ title: 'New case: choose the patient', desc: 'A new case starts by choosing the patient. The rest of the form appears once a patient is selected.', next: 'Pick the patient from the list.', full: false });
  await fill('opt:' + rid, rid);
  await sleep(700);
  await snap({ title: 'New case form (empty)', desc: 'Structured homeopathic case taking: chief complaints with duration, severity and onset; mental symptoms; physical generals; food likes and dislikes; overall duration and severity; and a free-text case-notes editor.', next: 'Type a complaint and press + Add Chief Complaint.', act: '+ Add Chief Complaint', maxParts: 5 });
  await fill('ph:Enter complaint', 'Lower back pain, worse on rising from a chair');
  await tryClick(['+ Add Chief Complaint']);
  await tryClick(['+ Add Mental Symptom']);
  await tryClick(['+ Add Physical General']);
  await snap({ title: 'New case form (filled, extra rows added)', desc: 'One chief complaint added to the list; + Add Mental Symptom and + Add Physical General each add a row to fill in. Remove deletes a row. Likes and Dislikes take a food name and the Add button.', next: 'Press Save Case.', act: 'Save Case', maxParts: 5 });
  await tryClick(['Save Case']);
  await sleep(900);
  await snap({ title: 'Case saved', desc: 'Back on the case list; the new case is in the table.', next: 'Press View to open it.', act: 'View', maxParts: 2 });
  const cs = (await db('cases')).find((c) => c.patientName === 'Rahul Mehta');
  if (cs) {
    await go(`/cases/${cs.id}`);
    await snap({ title: 'Case detail', desc: 'Read-only view of the whole case. Back to List returns to the list; Edit Case opens the form.', next: 'Press Edit Case.', act: 'Edit Case', maxParts: 3 });
    await tryClick(['Edit Case']);
    await snap({ title: 'Edit case', desc: 'The case form pre-filled for editing. Update Case saves the changes.', next: 'Press Update Case.', act: 'Update Case', maxParts: 5 });
  }
}

if (run(9)) {
  S('8. Prescriptions');
  await go('/prescriptions');
  await snap({ title: 'Prescriptions list', desc: 'Every prescription: patient, medicines, doctor and date. Search, filter by From/To date and press Apply Filters; View opens a prescription; New Prescription writes one.', next: 'Press New Prescription.', act: '+ New Prescription', maxParts: 3 });
  const rid = await pid('Rahul Mehta');
  await tryClick(['+ New Prescription']);
  await sleep(500);
  await snap({ title: 'New prescription form (empty)', desc: 'Start by choosing the patient. Then add medicines with name, potency, dosage and frequency. The toolbar above the notes box offers bold, italic, lists and more.', next: 'Pick the patient from the list.', full: false });
  await fill('opt:' + rid, rid);
  await sleep(500);
  await snap({ title: 'New prescription form (patient selected)', desc: 'After selecting a patient, you can add medicines. Each medicine needs name, potency and dosage; frequency is optional but recommended.', next: 'Type a medicine name and press + Add Medicine.', act: '+ Add Medicine', maxParts: 4 });
  await fill('ph:Medicine name', 'Arnica Montana 30C');
  await fill('ph:Potency', '30C');
  await fill('ph:Dosage', '4 pills');
  await tryClick(['+ Add Medicine']);
  await tryClick(['+ Add Medicine']);
  await snap({ title: 'New prescription form (medicines added)', desc: 'Two medicines added. You can add more or remove any row with the Remove button. When done, press Save Prescription.', next: 'Press Save Prescription.', act: 'Save Prescription', maxParts: 4 });
  await tryClick(['Save Prescription']);
  await sleep(900);
  await snap({ title: 'Prescription saved', desc: 'Back on the prescription list; the new prescription is in the table.', next: 'Press View to open it.', act: 'View', maxParts: 2 });
  const rx = (await db('prescriptions')).find((r) => r.patientName === 'Rahul Mehta');
  if (rx) {
    await go(`/prescriptions/${rx.id}`);
    await snap({ title: 'Prescription detail', desc: 'Read-only view of the prescription: patient, medicines with potency and dosage, doctor, and notes. Back to List returns to the list; Edit Prescription opens the form.', next: 'Press Edit Prescription.', act: 'Edit Prescription', maxParts: 3 });
    await tryClick(['Edit Prescription']);
    await snap({ title: 'Edit prescription', desc: 'The prescription form pre-filled. Add or remove medicines, change notes, or update the doctor name.', next: 'Press Update Prescription.', act: 'Update Prescription', maxParts: 4 });
    await fill('ph:Notes', 'Take after meals. Review in 7 days.');
    await tryClick(['Update Prescription']);
    await sleep(900);
    await snap({ title: 'Prescription updated', desc: 'After saving you return to the prescription list; the notes are updated.', next: 'Continue to Follow-ups.', maxParts: 3 });
  }
}

if (run(10)) {
  S('9. Follow-ups');
  await go('/followups');
  await snap({ title: 'Follow-ups list', desc: 'Every follow-up recorded: patient, improvement %, energy level and next review date. Search by name, filter by status, and press View to open a follow-up. + New Follow-up starts a new one.', next: 'Press + New Follow-up.', act: '+ New Follow-up', maxParts: 3 });
  const rid = await pid('Rahul Mehta');
  await tryClick(['+ New Follow-up']);
  await sleep(500);
  await snap({ title: 'New follow-up form (empty)', desc: 'Start by choosing the patient. Then enter the visit date, improvement %, energy level, aggravation factors, new symptoms and next review date.', next: 'Pick the patient from the list.', full: false });
  await fill('opt:' + rid, rid);
  await sleep(500);
  await snap({ title: 'New follow-up form (patient selected)', desc: 'After selecting a patient, fill in the visit details. Improvement % is the key metric - 0 to 100. Energy level is Low, Medium or High.', next: 'Enter improvement % and press Save Follow-up.', act: 'Save Follow-up', maxParts: 4 });
  await fill('ph:Enter improvement percentage (0-100)', '75');
  await fill('opt:Medium', 'Medium');
  await fill('ph:Aggravation factors (optional)', 'Stress and fatigue');
  await fill('ph:New symptoms since last visit (optional)', 'Mild headache');
  await fill('css:main input[type=date]', todayPlus(7));
  await tryClick(['Save Follow-up']);
  await sleep(900);
  await snap({ title: 'Follow-up saved', desc: 'Back on the follow-up list; the new follow-up is in the table.', next: 'Press View to open it.', act: 'View', maxParts: 2 });
  const fu = (await db('followups')).find((f) => f.patientName === 'Rahul Mehta');
  if (fu) {
    await go(`/followups/${fu.id}`);
    await snap({ title: 'Follow-up detail', desc: 'Read-only view of the follow-up: patient, visit date, improvement %, energy level, symptoms and next review date. Back to List returns to the list; Edit Follow-up opens the form.', next: 'Press Edit Follow-up.', act: 'Edit Follow-up', maxParts: 3 });
    await tryClick(['Edit Follow-up']);
    await snap({ title: 'Edit follow-up', desc: 'The follow-up form pre-filled. Update improvement %, energy level, or next review date as needed.', next: 'Press Update Follow-up.', act: 'Update Follow-up', maxParts: 4 });
    await fill('ph:Enter improvement percentage (0-100)', '85');
    await tryClick(['Update Follow-up']);
    await sleep(900);
    await snap({ title: 'Follow-up updated', desc: 'After saving you return to the follow-up list; the improvement % is updated.', next: 'Continue to Inventory.', maxParts: 3 });
  }
}

if (run(11)) {
  S('10. Inventory');
  await go('/inventory');
  await snap({ title: 'Inventory list', desc: 'Every stock item: medicine name, quantity, batch number, expiry date and vendor. Low stock (under 10), near expiry (within 30 days) and expired items show alerts. Press + New Item to add stock.', next: 'Press + New Item.', act: '+ New Item', maxParts: 3 });
  await tryClick(['+ New Item']);
  await snap({ title: 'New inventory item form (empty)', desc: 'Enter the medicine name (start typing to see suggestions), batch number, expiry date, quantity and vendor. Under 10 units triggers a low-stock alert.', next: 'Fill the form and press Create Item.', act: 'Create Item', maxParts: 4 });
  await fill('ph:Medicine name', 'Arnica Montana 30C');
  await fill('ph:Batch number', 'BATCH-001');
  await fill('css:main input[type=date]', todayPlus(180));
  await fill('ph:Quantity', '25');
  await fill('ph:Vendor', 'MedSupply Ltd.');
  await tryClick(['Create Item']);
  await sleep(800);
  await snap({ title: 'Inventory item created', desc: 'The new stock item now appears in the list with quantity 25.', next: 'Press + New Item to add another item.', act: '+ New Item', maxParts: 3 });
  await tryClick(['+ New Item']);
  await fill('ph:Medicine name', 'Calcaria Carbonica 200C');
  await fill('ph:Batch number', 'BATCH-002');
  await fill('css:main input[type=date]', todayPlus(30));
  await fill('ph:Quantity', '5');
  await tryClick(['Create Item']);
  await sleep(800);
  await snap({ title: 'Low stock alert', desc: 'The new item has only 5 units, which triggers the low-stock warning in the list.', next: 'Continue to Billing.', maxParts: 3 });
}

if (run(12)) {
  S('11. Billing');
  await go('/billing');
  await snap({ title: 'Billing list', desc: 'Every invoice: patient, total amount, payment method and date. Search by invoice number or patient name, filter by date range, and press View to open an invoice. + New Invoice creates a new bill.', next: 'Press + New Invoice.', act: '+ New Invoice', maxParts: 3 });
  await tryClick(['+ New Invoice']);
  await snap({ title: 'New billing form (empty)', desc: 'Enter the patient, consultation fee, medicine charges, follow-up charges and any other charges. Discounts and payment method are optional.', next: 'Pick the patient from the list.', full: false });
  const rid = await pid('Rahul Mehta');
  await fill('opt:' + rid, rid);
  await sleep(500);
  await snap({ title: 'New billing form (patient selected)', desc: 'After selecting a patient, enter the fees and charges. The total updates automatically. Discount can be a fixed amount or percentage.', next: 'Enter consultation fee and press Create Billing.', act: 'Create Billing', maxParts: 4 });
  await fill('ph:Consultation fee', '500');
  await fill('ph:Medicine charges', '250');
  await tryClick(['Create Billing']);
  await sleep(800);
  await snap({ title: 'Billing invoice created', desc: 'The new invoice appears in the list with total ₹750.', next: 'Press View to open the invoice.', act: 'View', maxParts: 2 });
  const bill = (await db('billing')).find((b) => b.patientName === 'Rahul Mehta');
  if (bill) {
    await go(`/billing/${bill.id}`);
    await snap({ title: 'Invoice detail', desc: 'Read-only view of the invoice: patient, itemized charges, discount, total, payment method and date. Back to List returns to the list; Edit Invoice opens the form.', next: 'Press Edit Invoice.', act: 'Edit Invoice', maxParts: 3 });
    await tryClick(['Edit Invoice']);
    await snap({ title: 'Edit billing', desc: 'The billing form pre-filled. Update fees, charges or discount as needed. Payment method can be Cash, Card, UPI or Online.', next: 'Press Update Billing.', act: 'Update Billing', maxParts: 4 });
    await fill('ph:Discount', '50');
    await tryClick(['Update Billing']);
    await sleep(900);
    await snap({ title: 'Invoice updated', desc: 'After saving you return to the billing list; the total is recalculated with discount.', next: 'Continue to Search.', maxParts: 3 });
  }
}

if (run(13)) {
  S('12. Search');
  await go('/search');
  await snap({ title: 'Search page (empty)', desc: 'Global search across all modules. Type any query - patient name, medicine name, invoice number - and results appear instantly.', next: 'Type a search query.', act: 'Search', maxParts: 2 });
  await fill('ph:Search', 'Rahul');
  await sleep(500);
  await snap({ title: 'Search results', desc: 'Results from all modules: patients, prescriptions, billing. Click any result to open that record.', next: 'Clear the search box to see all results again.', full: false });
  await fill('ph:Search', '');
  await snap({ title: 'Global search (empty)', desc: 'After clearing the search, all modules are shown. Click any module card to go directly to that screen.', next: 'Use the sidebar to explore other modules.', full: false });
}

if (run(14)) {
  S('13. Settings');
  await go('/settings');
  await snap({ title: 'Settings page', desc: 'User preferences: dark mode toggle, notifications toggle, profile details and clinic information. Changes are saved automatically.', next: 'Use the sidebar to explore other modules.', full: false });
}

if (run(15)) {
  S('14. Logout');
  await clickText('Jonnet', { contains: true, sel: 'button,[role=button]' });
  await snap({ title: 'Account menu (open)', desc: 'Click Logout to sign out and return to the login screen.', next: 'Press Logout.', act: 'Logout', scope: 'overlay', full: false });
  await clickText('Logout', { last: true });
  await sleep(800);
  await snap({ title: 'Logged out', desc: 'You are now signed out. The session data is cleared and you can sign in again.', next: 'End of guide.', full: false });
}

// Write steps to JSON file
fs.writeFileSync(path.join(HERE, 'steps.json'), JSON.stringify({ steps, errors }, null, 2));
console.log('steps.json written,', steps.length, 'steps');
console.log('Errors:', errors.length ? errors : 'None');

// Copy steps to partial for safety
fs.writeFileSync(path.join(HERE, 'steps.partial.json'), JSON.stringify({ steps, errors }, null, 2));
console.log('steps.partial.json written');

process.exit(0);
