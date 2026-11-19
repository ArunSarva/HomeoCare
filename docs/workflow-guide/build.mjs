// Builds guide.html from steps.json + shots/, then prints it to a PDF using the
// same headless Edge. Usage: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { steps, errors } = JSON.parse(fs.readFileSync(path.join(HERE, 'steps.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- what each control does ----------
const NAV = {
  Dashboard: 'Opens the Dashboard (home screen with today\'s numbers).',
  Patients: 'Opens the Patients module: list, search, register and edit patients.',
  Appointments: 'Opens the Appointments module: calendar and booking list.',
  Cases: 'Opens the Cases module: homeopathic case histories.',
  Prescriptions: 'Opens the Prescriptions module.',
  'Follow-ups': 'Opens the Follow-ups module. The orange badge shows how many reviews are due in the next 3 days.',
  Inventory: 'Opens the medicine Inventory module. The orange badge shows how many items are low, near expiry or expired.',
  Billing: 'Opens the Billing module: invoices, revenue dashboard and reports.',
  Search: 'Opens the global Search page.',
};
const RULES = [
  [/^collapse sidebar$/i, 'Shrinks the left sidebar to icons only. The choice is remembered.'],
  [/^expand sidebar$/i, 'Brings the full sidebar back.'],
  [/^open menu$/i, 'Phones only: opens the navigation drawer.'],
  [/^notifications$/i, 'Opens the notifications pop-over (follow-ups due, low stock and similar alerts).'],
  [/^open search/i, 'Opens the command palette (same as pressing Ctrl + K).'],
  [/^new$/i, 'Quick-create menu: start a new patient, appointment, prescription or bill from any screen.'],
  [/toggle dark mode/i, 'Switches between the light and dark colour themes.'],
  [/^(j )?jonnet\b.*doctor$/i, 'Account chip: shows who is signed in (Jonnet, role Doctor). Click it to open the account menu.'],
  [/^profile$/i, 'Opens the Settings page (profile details).'],
  [/^settings$/i, 'Opens the Settings page.'],
  [/^keyboard shortcuts$/i, 'Shows the list of keyboard shortcuts.'],
  [/^logout$/i, 'Signs you out and returns to the login screen.'],
  [/^username$/i, 'Type your user name (jonnet).'],
  [/^password$/i, 'Type your password. Characters are shown as dots.'],
  [/^show password|^hide password/i, 'Eye icon: toggles between hidden and readable password.'],
  [/^sign in$/i, 'Checks the user name and password. On success you land on the Dashboard; otherwise a red message appears.'],
  [/^refresh/i, 'Reloads the figures on this screen from the saved data.'],
  [/^new appointment$/i, 'Opens the New appointment form.'],
  [/^new patient$/i, 'Opens the patient registration form.'],
  [/^new prescription$/i, 'Opens the prescription builder.'],
  [/^new bill$/i, 'Opens the New invoice form.'],
  [/^add appointment$/i, 'Opens the New appointment form (shown when the day is empty).'],
  [/^view calendar/i, 'Opens the Appointments screen.'],
  [/^all$/i, 'Opens the full Follow-ups list.'],
  [/^view inventory/i, 'Opens the Inventory list (low-stock banner).'],
  [/^today's appointments:/i, 'Summary tile. Click to open the Appointments screen. Shows how many bookings are today and how many are done.'],
  [/^follow-ups due:/i, 'Summary tile. Click to open the Follow-ups list. Counts reviews due in the next 3 days and how many are overdue.'],
  [/^active cases:/i, 'Summary tile. Click to open the Cases list.'],
  [/^monthly revenue:/i, 'Summary tile. Click to open the Billing dashboard. Shows money billed this month.'],
  [/^call /i, 'Phone link: calls this patient from a phone or softphone.'],
  [/^whatsapp /i, 'Opens WhatsApp chat with this patient.'],
  [/^\d{1,2}:\d{2} (am|pm)/i, 'One visit in today\'s schedule. Click to open that appointment.'],
  [/^add patient$/i, 'Opens the New patient form.'],
  [/^search patients$/i, 'Type a name, patient number, mobile or e-mail to filter the list instantly.'],
  [/^patient$/i, 'Column heading. Click to sort the list by patient name; click again to reverse.'],
  [/^registered/i, 'Column heading. Click to sort by registration date; click again to reverse.'],
  [/^rows per page$|^10$|^20$|^50$/i, 'Choose how many rows appear on each page of the table.'],
  [/^edit .+/i, 'Edit icon for this row (pencil). Opens the edit form.'],
  [/^delete .+/i, 'Delete icon for this row (bin). Asks for confirmation before deleting.'],
  [/^edit$/i, 'Opens the edit form for this record.'],
  [/^delete$/i, 'Deletes this record after a confirmation box.'],
  [/^cancel$/i, 'Closes the form or box without saving anything.'],
  [/^save patient$/i, 'Checks the form. If all required fields are fine the patient is saved and the list opens.'],
  [/^save changes$/i, 'Saves the edits and returns to the patient record.'],
  [/^full name$/i, 'Patient\'s full name. Required.'],
  [/^gender$/i, 'Choose Male, Female or Other. Required.'],
  [/^date of birth$/i, 'Pick the birth date. The Age box fills itself in from this.'],
  [/^age$/i, 'Calculated automatically from the date of birth (read-only). Type it only if the birth date is not known.'],
  [/^mobile$/i, 'Main phone number. Required, 10 digits.'],
  [/^whatsapp$/i, 'WhatsApp number. Leave empty if it is the same as the mobile.'],
  [/^bmi$/i, 'Body-mass index. Calculated from height and weight.'],
  [/^registration date$/i, 'Date the patient joined. Today by default.'],
  [/^\+ new appointment$/i, 'Opens the New appointment form.'],
  [/^(day|week|month)$/i, 'Switches the calendar to this view.'],
  [/^today$/i, 'Jumps the calendar to today.'],
  [/^←$|^ΓåÉ$|^ΓåÆ$|^→$/, 'Moves the calendar one step back or forward.'],
  [/^go to date$/i, 'Pick any date to show on the calendar.'],
  [/^create appointment$/i, 'Checks the form and books the appointment.'],
  [/^update appointment$/i, 'Saves the changes to this appointment.'],
  [/^edit appointment$/i, 'Opens the appointment form with the saved values.'],
  [/^back to list$/i, 'Returns to the list without changes.'],
  [/^back to (billing|prescriptions)$/i, 'Returns to the list.'],
  [/^start time$/i, 'Time the visit starts.'],
  [/^end time$/i, 'Time the visit ends.'],
  [/^reason\/note$/i, 'Reason for the visit or any note. Use the toolbar buttons above the box for bold, italic or lists.'],
  [/^status$/i, 'Current state of the record.'],
  [/^type$/i, 'Kind of appointment (for example Consultation, Follow-Up).'],
  [/^\+ new case$/i, 'Opens the new case form.'],
  [/^view$/i, 'Opens this record in read-only view.'],
  [/^date filter$/i, 'Show only records on a chosen date.'],
  [/^\+ add chief complaint$/i, 'Adds what you typed (and the duration, severity, onset) to the list of chief complaints.'],
  [/^complaint$/i, 'The patient\'s main complaint in their own words.'],
  [/^duration$/i, 'How long the complaint has lasted (for example 3 months).'],
  [/^severity$/i, 'Mild, Moderate or Severe.'],
  [/^onset$/i, 'How it began (Gradual, Sudden, Seasonal...).'],
  [/^remove$/i, 'Deletes this row from the form.'],
  [/^\+ add mental symptom$/i, 'Adds a row for a mental symptom (for example anxiety).'],
  [/^\+ add physical general$/i, 'Adds a row for a physical general (for example thermal state, thirst).'],
  [/^likes$|^dislikes$/i, 'Type a food and press Add.'],
  [/^add$/i, 'Adds the typed food to the list.'],
  [/^total duration$/i, 'Overall length of the illness.'],
  [/^save case$/i, 'Saves the case and opens the case list.'],
  [/^update case$/i, 'Saves the changes to this case.'],
  [/^edit case$/i, 'Opens the case form with the saved values.'],
  [/^new prescription$/i, 'Opens the prescription builder.'],
  [/^apply filters$/i, 'Applies the From / To dates to the list.'],
  [/^from date$|^to date$/i, 'Pick a date to limit the list.'],
  [/^load template$/i, 'Fills the medicine list from a saved template.'],
  [/^save as template$/i, 'Stores the current medicine list as a reusable template.'],
  [/^medicine$/i, 'Medicine name. Start typing to see suggestions or enter any name.'],
  [/^potency$/i, 'Strength, for example 30C, 200C, 1M.'],
  [/^dosage$/i, 'How much each time, for example 4 pills or 2 drops.'],
  [/^frequency$/i, 'How often, for example three times daily.'],
  [/^\+ add medicine$/i, 'Adds another medicine row.'],
  [/^print prescription$/i, 'Sends the prescription to the printer or Save-as-PDF.'],
  [/^save prescription$/i, 'Saves the prescription and opens the list.'],
  [/^new follow-up$/i, 'Opens the new follow-up form.'],
  [/^history$/i, 'Shows that patient\'s full visit history at the bottom of the page.'],
  [/^new visit$/i, 'Opens the follow-up form for another visit of this patient.'],
  [/^filter by status$/i, 'Show only Improved, Stable or Worse follow-ups.'],
  [/^start date$|^end date$/i, 'Pick a date to limit the list.'],
  [/^improvement %$/i, 'How much the patient has improved, 0 to 100.'],
  [/^energy level$/i, 'Low, Medium or High.'],
  [/^aggravation factors$/i, 'What makes the symptoms worse.'],
  [/^new symptoms$/i, 'Any symptom that appeared since last visit.'],
  [/^next review date$/i, 'Date of the next follow-up.'],
  [/^visit date$/i, 'Date of this visit.'],
  [/^improved$|^stable$|^worse$/i, 'Overall condition at this visit. Choose one.'],
  [/^save follow-up$/i, 'Saves the follow-up and opens the list.'],
  [/^show alerts$/i, 'Opens a panel listing only items that are low, near expiry or expired.'],
  [/^hide alerts$/i, 'Closes the alerts panel.'],
  [/^\+ new item$/i, 'Opens the new inventory item form.'],
  [/^medicine name$/i, 'Name and potency of the stock item.'],
  [/^batch number$/i, 'Manufacturer batch number.'],
  [/^expiry date$/i, 'Date the stock expires. Within 30 days it is flagged Near Expiry.'],
  [/^quantity$/i, 'Units in stock. Under 10 is flagged Low Stock.'],
  [/^unit price/i, 'Price of one unit in rupees.'],
  [/^vendor$/i, 'Supplier name.'],
  [/^create item$/i, 'Saves the item (also the save button when editing).'],
  [/^edit item$/i, 'Opens the item form with the saved values.'],
  [/^\+ new invoice$/i, 'Opens the new invoice form.'],
  [/^export csv$/i, 'Downloads the figures as a spreadsheet file (CSV).'],
  [/^inv-/i, 'Invoice number. Click to open the invoice.'],
  [/^consultation fee/i, 'Doctor\'s fee in rupees.'],
  [/^medicine charges/i, 'Cost of medicines in rupees.'],
  [/^follow-up charges/i, 'Charges for follow-up visits.'],
  [/^other charges/i, 'Any other charge.'],
  [/^discount/i, 'Amount taken off the total.'],
  [/^payment method$/i, 'Cash, Card, UPI or Online.'],
  [/^create billing$/i, 'Saves the invoice (also the save button when editing).'],
  [/^edit billing$/i, 'Opens the invoice form with the saved values.'],
  [/^reports$/i, 'Opens Revenue reports.'],
  [/^all invoices$/i, 'Opens the billing list.'],
  [/^apply$/i, 'Applies the chosen dates.'],
  [/^(bold|italic|underline|ordered list|bullet list|undo|redo|insert table)/i, 'Editor toolbar button: formats or edits the text in the box below.'],
  [/^start typing|^type \/case|^enter any additional|^describe |^additional notes/i, 'Rich-text box. Click and type; use the toolbar above for bold, italic, lists.'],
  [/^clinic name$/i, 'Name of the clinic.'],
  [/^clinic address$/i, 'Address of the clinic.'],
  [/^phone number$/i, 'Clinic phone number.'],
  [/^enable dark mode$/i, 'Tick to prefer dark mode.'],
  [/^enable notifications$/i, 'Tick to receive alerts.'],
  [/^go to dashboard$/i, 'Opens the Dashboard.'],
  [/^view patients$/i, 'Opens the Patients list.'],
];

function describe(it) {
  const label = it.label || '';
  const nav = NAV[label.replace(/\s*\d+$/, '')];
  if (nav && (it.kind === 'Button' || it.kind === 'Link')) return nav;
  for (const [re, text] of RULES) if (re.test(label)) return text + (it.repeated ? ' Same on every row.' : '');
  let d;
  switch (it.kind) {
    case 'Button': d = `Press to ${label.replace(/^\+\s*/, 'add: ')}.`; break;
    case 'Link': d = `Link${it.href ? ' to ' + it.href : ''}.`; break;
    case 'Drop-down list': d = `Choose one value${it.options && it.options.length ? ' (' + it.options.slice(0, 8).join(', ') + (it.options.length > 8 ? ', ...' : '') + ')' : ''}.`; break;
    case 'Date picker': d = 'Pick a date (day-month-year).'; break;
    case 'Time picker': d = 'Pick a time.'; break;
    case 'Number box': d = 'Type a number.'; break;
    case 'Phone box': d = 'Type a phone number.'; break;
    case 'E-mail box': d = 'Type an e-mail address (optional).'; break;
    case 'Check box': d = 'Tick to switch on, untick to switch off.'; break;
    case 'Option button': d = 'Choose this option.'; break;
    case 'Search box': d = 'Type to search.'; break;
    case 'Rich-text editor': d = 'Click and type.'; break;
    case 'Tab': d = 'Switches to this tab.'; break;
    case 'Menu item': d = 'Menu choice.'; break;
    default: d = 'Type the value.';
  }
  if (/box|area|list|picker|Switch/.test(it.kind) && it.placeholder) d += ` Example: "${it.placeholder}".`;
  if (it.repeated) d += ' Same on every row.';
  return d;
}
function tail(it) {
  const bits = [];
  if (it.required) bits.push('Required.');
  if (it.readonly) bits.push('Read-only or disabled.');
  if (it.value && !/password/i.test(it.kind) && it.value.length < 60 && /box|area|list|picker/.test(it.kind)) bits.push(`Shown here: "${esc(it.value)}".`);
  return bits.join(' ');
}

// ---------- page building ----------
let toc = '';
let body = '';
let curSection = '';
const total = steps.length;
for (const s of steps) {
  if (s.section !== curSection) {
    curSection = s.section;
    toc += `<h3>${esc(s.section)}</h3><ul>`;
    body += `<section class="divider"><div class="small">Section</div><h1>${esc(s.section)}</h1><p>${steps.filter((x) => x.section === s.section).length} steps in this section.</p></section>`;
  }
  toc += `<li><a href="#s${s.no}">Step ${s.no}. ${esc(s.title)}</a></li>`;
  const nextSection = steps[steps.indexOf(s) + 1]?.section !== s.section;
  if (nextSection) toc += '</ul>';
  const multi = s.images.length > 1;
  s.images.forEach((im, idx) => {
    const rows = im.items.map((it) => `<tr class="${it.isAct ? 'act' : ''}"><td class="n"><span class="b ${it.isAct ? 'g' : ''}">${it.n}</span></td><td class="c">${esc(it.label)}</td><td class="k">${esc(it.kind)}</td><td>${esc(describe(it))} ${esc(tail(it))}${it.isAct ? ' <b>Click this next.</b>' : ''}</td></tr>`).join('');
    body += `<section class="step" ${idx === 0 ? `id="s${s.no}"` : ''}>
      <div class="hd"><span class="tag">Step ${s.no} of ${total}</span><span class="sec">${esc(s.section)}</span></div>
      <h2>${esc(s.title)}${multi ? ` <small>(screen part ${idx + 1} of ${s.images.length})</small>` : ''}</h2>
      ${idx === 0 ? `<p class="desc">${esc(s.desc)}</p><p class="next"><b>Next:</b> ${esc(s.next)}</p>` : '<p class="desc">The page continues below. Scroll down to see this part.</p>'}
      <div class="shot"><img src="shots/${im.file}"></div>
      ${rows ? `<table class="legend"><thead><tr><th>#</th><th>Control</th><th>Type</th><th>What it does / what to enter</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="none">No clickable controls in this part of the page (information only).</p>'}
      <div class="addr">Address: ${esc(s.url)}</div>
    </section>`;
  });
}

// unique addresses appendix
const seen = new Map();
for (const s of steps) { const key = s.url.replace(/\/[0-9a-f-]{20,}|\/(APT|INV|BILL|FU|C|Rx)\d+/g, '/:id'); if (!seen.has(key)) seen.set(key, s); }
const addr = [...seen.entries()].map(([u, s]) => `<tr><td><code>${esc(u)}</code></td><td>${esc(s.title)}</td><td>Step ${s.no}</td></tr>`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><title>HomeoCare Pro - Complete workflow guide</title>
<style>
@page { size: A4 landscape; margin: 9mm 10mm 12mm; }
* { box-sizing: border-box; }
body { font: 10pt/1.4 'Segoe UI', Arial, sans-serif; color: #1c2b27; margin: 0; }
h1 { font-size: 30pt; margin: 0 0 6mm; color: #0b8a6b; }
h2 { font-size: 15pt; margin: 1mm 0 2mm; }
h2 small { font-size: 9pt; color: #777; font-weight: 400; }
h3 { color: #0b8a6b; margin: 4mm 0 1mm; }
.cover { height: 185mm; display: flex; flex-direction: column; justify-content: center; padding: 0 20mm; background: linear-gradient(135deg,#064e3b,#0b8a6b); color: #fff; border-radius: 6mm; page-break-after: always; }
.cover h1 { color: #fff; font-size: 44pt; } .cover p { font-size: 15pt; max-width: 220mm; }
.page { page-break-after: always; } .page h1 { font-size: 22pt; }
.step { page-break-before: always; } .divider { page-break-before: always; height: 175mm; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding-left: 20mm; } .divider .small { text-transform: uppercase; letter-spacing: 2px; color: #777; }
.hd { display: flex; justify-content: space-between; font-size: 8.5pt; color: #666; border-bottom: 1px solid #dde; padding-bottom: 1mm; }
.tag { background: #0b8a6b; color: #fff; padding: 0 6px; border-radius: 3px; font-weight: 600; }
.desc { margin: 0 0 1.5mm; } .next { margin: 0 0 2mm; color: #0b6b53; }
.shot { text-align: center; } .shot img { max-width: 100%; max-height: 138mm; border: 1px solid #c9d3cf; border-radius: 3px; }
.legend { width: 100%; border-collapse: collapse; margin-top: 3mm; font-size: 8.8pt; page-break-inside: auto; }
.legend th { background: #eef5f2; text-align: left; padding: 2px 5px; border: 1px solid #cfdad5; }
.legend td { padding: 2px 5px; border: 1px solid #dfe7e3; vertical-align: top; }
.legend tr { page-break-inside: avoid; } .legend .n { width: 9mm; text-align: center; } .legend .c { width: 55mm; font-weight: 600; } .legend .k { width: 26mm; color: #555; }
.b { display: inline-block; width: 6mm; height: 6mm; line-height: 6mm; border-radius: 50%; background: #e11d48; color: #fff; font-weight: 700; font-size: 8.5pt; text-align: center; }
.b.g { background: #059669; } tr.act td { background: #ecfdf5; }
.addr, .none { font-size: 8pt; color: #888; margin-top: 2mm; }
table.t { border-collapse: collapse; font-size: 9pt; } table.t td, table.t th { border: 1px solid #ccd; padding: 2px 6px; text-align: left; }
ul { margin: 0 0 2mm; padding-left: 5mm; } li { margin: 0; } a { color: #0b6b53; text-decoration: none; }
.cols { column-count: 2; column-gap: 10mm; } .cols h3 { break-after: avoid; }
code { background: #f1f5f4; padding: 0 3px; }
</style></head><body>
<div class="cover"><h1>HomeoCare Pro</h1><p>Complete workflow guide with screenshots</p><p style="font-size:11pt;opacity:.9">Every screen and every operation of the clinic management application, with a numbered balloon on each control. ${total} steps. Generated ${new Date().toLocaleDateString('en-GB')}.</p></div>

<div class="page"><h1>How to read this guide</h1>
<p>Each page shows one real screen of the running application. Every button, link, box and menu that you can click or fill in is marked with a numbered balloon and a dashed outline. The table under the picture explains each balloon in the same order.</p>
<p><span class="b">1</span> Red balloon: a control on the screen.&nbsp;&nbsp; <span class="b g">2</span> Green balloon: the control to click next to reach the following step.</p>
<ul>
<li>Balloon numbers restart at 1 on every step. When a page is longer than the window, it is shown in several parts and the numbers continue from one part to the next.</li>
<li>Tables with many rows show balloons on the first row only; the legend says "Same on every row" for those.</li>
<li>Steps follow a real working session: first the empty application, then the same screens filled with sample clinic data (20 patients with their visits, cases, prescriptions, follow-ups, stock and bills), then adding, viewing, editing and deleting records in every module.</li>
</ul>
<h3>Signing in</h3><p>Address: the application home page. User name <b>jonnet</b>, password <b>123</b>. The account has the Doctor role, which can open every module.</p>
<h3>Modules (left sidebar)</h3>
<table class="t"><tr><th>Module</th><th>Used for</th></tr>
<tr><td>Dashboard</td><td>Today's numbers: appointments, follow-ups due, active cases, revenue, charts, quick actions.</td></tr>
<tr><td>Patients</td><td>Register patients, search, view and edit their records.</td></tr>
<tr><td>Appointments</td><td>Day, week and month calendar; book, edit, complete, cancel, delete visits.</td></tr>
<tr><td>Cases</td><td>Homeopathic case taking: complaints, mental symptoms, generals, food preferences, notes.</td></tr>
<tr><td>Prescriptions</td><td>Write, template, print and review prescriptions.</td></tr>
<tr><td>Follow-ups</td><td>Record progress between visits and schedule the next review.</td></tr>
<tr><td>Inventory</td><td>Medicine stock with batch, expiry and low-stock alerts.</td></tr>
<tr><td>Billing</td><td>Invoices, payments, revenue dashboard and reports.</td></tr>
<tr><td>Search</td><td>One search box across patients, medicines, cases, prescriptions, follow-ups, appointments and billing.</td></tr></table>
<h3>Keyboard shortcuts</h3><p><b>Ctrl + K</b> opens the command palette. <b>N</b> (when not typing in a box) opens a new patient form. <b>Esc</b> closes menus and dialogs.</p></div>

<div class="page"><h1>Contents</h1><div class="cols">${toc}</div></div>
${body}
<div class="step"><h1>Appendix A. Screen addresses</h1><table class="t"><tr><th>Address</th><th>Screen</th><th>First shown in</th></tr>${addr}</table>
<h1 style="margin-top:8mm">Appendix B. Things worth knowing</h1><ul>
<li>Data is stored in the browser of the computer that uses the application (offline first). Another computer or browser starts empty.</li>
<li>Deleting an appointment, inventory item or invoice uses the browser's own "Are you sure?" box; deleting a patient uses the application's own dialog.</li>
<li>On the inventory and billing edit screens the save button is labelled "Create Item" / "Create Billing" even though it updates the existing record.</li>
<li>Edit and Delete icons in the patient list appear when you point at a row.</li>
<li>The Keyboard shortcuts item in the account menu does not open a screen yet; the shortcuts are listed on the How to read this guide page.</li>
<li>Roles: Receptionist users (if added later) cannot open Cases, Prescriptions, Follow-ups, Inventory or Billing; they see an "Access Denied" page.</li></ul>
</div>
</body></html>`;
fs.writeFileSync(path.join(HERE, 'guide.html'), html);
console.log('guide.html written,', steps.length, 'steps');

const { cdp, ev, sleep, close } = await connect();
await cdp('Page.navigate', { url: pathToFileURL(path.join(HERE, 'guide.html')).href });
await sleep(6000);
const r = await cdp('Page.printToPDF', {
  landscape: true, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888">HomeoCare Pro workflow guide &nbsp;|&nbsp; page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  transferMode: 'ReturnAsStream',
});
const stream = r.result.stream;
const out = fs.createWriteStream(path.join(HERE, 'HomeoCare-Pro-Workflow-Guide.pdf'));
for (;;) {
  const c = await cdp('IO.read', { handle: stream, size: 4 * 1024 * 1024 });
  out.write(Buffer.from(c.result.data, c.result.base64Encoded ? 'base64' : 'utf8'));
  if (c.result.eof) break;
}
await new Promise((r2) => out.end(r2));
await cdp('IO.close', { handle: stream });
console.log('PDF written', (fs.statSync(path.join(HERE, 'HomeoCare-Pro-Workflow-Guide.pdf')).size / 1e6).toFixed(1), 'MB');
process.exit(0);
