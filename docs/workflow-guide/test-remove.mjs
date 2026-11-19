// Browser check for Settings > Load / Remove Demo Data.
import { connect } from './lib.mjs';
const { ev, go, sleep, errors } = await connect();
const q = JSON.stringify;
const count = (s) => ev(`new Promise(res=>{const r=indexedDB.open('HomeoCareDB'); r.onsuccess=()=>{const d=r.result; if(!d.objectStoreNames.contains('${s}')){res(0);return;} const g=d.transaction('${s}').objectStore('${s}').count(); g.onsuccess=()=>{d.close();res(g.result)}}})`);
const counts = async () => { const o = {}; for (const s of ['patients','appointments','cases','prescriptions','followups','inventory','billing']) o[s] = await count(s); return o; };
const click = async (t, last = false) => { const ok = await ev(`(function(){const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.trim()===${q(t)}); const e=b[${last ? 'b.length-1' : '0'}]; if(!e) return false; e.click(); return true;})()`); await sleep(900); return ok; };
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + ': ' + detail); };

await go('/login');
await ev(`new Promise(res=>{localStorage.clear(); const d=indexedDB.deleteDatabase('HomeoCareDB'); d.onsuccess=d.onerror=d.onblocked=()=>res(1);})`);
await go('/login');
await ev(`(function(){const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; const u=document.querySelector('input[autocomplete=username]'), p=document.querySelector('input[autocomplete=current-password]'); s.call(u,'admin'); u.dispatchEvent(new Event('input',{bubbles:true})); s.call(p,'password'); p.dispatchEvent(new Event('input',{bubbles:true}));})()`);
await click('Sign in'); await sleep(1200);

// Own data first: one patient and one stock item that must survive.
await go('/patients/new');
await ev(`(function(){const S=(el,v)=>{const pr=el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(pr,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));}; S(document.querySelector('[placeholder="e.g. Ravi Kumar"]'),'Own Patient'); S(document.querySelector('[placeholder="10-digit mobile number"]'),'9000000001'); S(document.querySelector('main input[type=date]'),'1980-01-01'); S([...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value==='Female')),'Female');})()`);
await click('Save patient'); await sleep(1200);
const before = await counts();
check('Own patient saved', before.patients === 1, JSON.stringify(before));

await go('/settings');
await click('Load Demo Data'); await click('Load Demo Data', true);
for (let i = 0; i < 40 && !(await ev(`document.body.innerText.includes('Demo data added')`)); i++) await sleep(500);
const loaded = await counts();
check('Demo data loaded', loaded.patients === 21 && loaded.appointments === 8 && loaded.cases === 6 && loaded.prescriptions === 6 && loaded.followups === 6 && loaded.inventory === 6 && loaded.billing === 5, JSON.stringify(loaded));

check('Remove button shown', await ev(`[...document.querySelectorAll('button')].some(b=>b.innerText.trim()==='Remove Demo Data')`), '');
await click('Remove Demo Data');
const dlg = await ev(`document.body.innerText.includes('permanently deletes the 20 sample patients')`);
check('Remove confirmation dialog', dlg, '');
await click('Cancel', true);
const afterCancel = await counts();
check('Cancel keeps data', afterCancel.patients === 21, JSON.stringify(afterCancel));

await click('Remove Demo Data'); await click('Remove Demo Data', true);
for (let i = 0; i < 40 && !(await ev(`document.body.innerText.includes('Demo data removed')`)); i++) await sleep(500);
const msg = await ev(`(document.body.innerText.match(/Demo data removed\\.\\s+[^\\n]+/)||[''])[0].replace(/\\s+/g,' ')`);
const after = await counts();
check('Removal message', /20 patients, 8 appointments, 6 cases, 6 prescriptions, 6 follow-ups, 6 inventory items and 5 billing/.test(msg), msg);
check('Only own patient left', after.patients === 1 && after.appointments === 0 && after.cases === 0 && after.prescriptions === 0 && after.followups === 0 && after.inventory === 0 && after.billing === 0, JSON.stringify(after));
const own = await ev(`new Promise(res=>{const r=indexedDB.open('HomeoCareDB'); r.onsuccess=()=>{const g=r.result.transaction('patients').objectStore('patients').getAll(); g.onsuccess=()=>res(g.result.map(p=>p.fullName).join(','))}})`);
check('Own patient kept', own === 'Own Patient', own);

await go('/patients');
const list = await ev(`document.querySelector('main').innerText.replace(/\\s*\\n\\s*/g,' | ').slice(0,200)`);
check('Patient list refreshed', /1 registered patient/.test(list) && !/Pooja Bhatt/.test(list), list);
await go('/dashboard');
const dash = await ev(`document.querySelector('main').innerText.replace(/\\s*\\n\\s*/g,' | ').slice(0,260)`);
check('Dashboard shows no demo data', /0 appointments today/.test(dash) || /You have 0/.test(dash), dash);

// Load again after removing: works a second time.
await go('/settings');
await click('Load Demo Data'); await click('Load Demo Data', true);
for (let i = 0; i < 40 && !(await ev(`document.body.innerText.includes('Demo data added')`)); i++) await sleep(500);
const again = await counts();
check('Load works again after remove', again.patients === 21 && again.inventory === 6, JSON.stringify(again));

console.log('console errors:', [...new Set(errors)].length, [...new Set(errors)].join(' || '));
console.log(`${results.filter(Boolean).length} passed, ${results.filter((x) => !x).length} failed`);
process.exit(0);
