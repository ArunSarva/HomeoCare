# HomeoCare Pro — UI/UX Style Guide

*A complete design specification to give to Kiro. Stack assumed: React + TypeScript + Tailwind CSS + Vite. Replace the existing colors, spacing and layout with everything below.*

---

## 1. What is wrong with the current screen

Kiro should fix these first:

1. **Sidebar** – the active item is a full-bleed blue block touching the edges, there are no icons, no grouping, and items have no padding or radius. It looks like a raw list, not navigation.
2. **Fake data** – every KPI shows a growth percentage (+12.5%, -2.3%) while the value is 0. "Urgent vs last month" makes no sense. Never show a delta when there is no data.
3. **Empty charts** – four large cards that only say "No data available". Replace with designed empty states with an action.
4. **Weak hierarchy** – the page title appears twice (top bar and page heading), the KPI cards all have the same weight, and nothing tells the doctor what to do *today*.
5. **Colors** – default Tailwind blue plus pastel icon tiles in five unrelated hues (blue, teal, amber, green, red). Nothing feels like a healthcare or homeopathy brand.
6. **Bottom-left** – an empty blue circle (avatar without name) and a loud red Logout button that draws more attention than any primary action.
7. **"Refreshing..."** button looks stuck and disabled. Use a subtle icon button with a spinner only while loading.
8. **Floating date/time box** overlapping the charts. Move it into the top bar.

---

## 2. Design direction

**Personality:** calm, clinical, natural, trustworthy. Think "modern private clinic", not "admin template".

**Principles**

- **Calm over loud** – one strong accent color, everything else neutral.
- **Doctor-first** – the dashboard answers: *Who is coming today? Who needs a follow-up? What is running low?*
- **Honest data** – no fake numbers, no empty decorative widgets.
- **Density with air** – compact tables for work, generous space around headings and cards.
- **Consistent** – every spacing, radius, color and shadow comes from tokens below. No hard-coded values.

---

## 3. Color system

Primary is a **deep sage/emerald teal** (natural, medical, calm). Accent is a warm **amber** used sparingly for attention. Avoid pure black and pure white text/backgrounds.

### 3.1 Light theme

| Token | Hex | Usage |
| --- | --- | --- |
| `--bg` | `#F6F8F7` | App background |
| `--surface` | `#FFFFFF` | Cards, tables, modals |
| `--surface-2` | `#F0F4F2` | Hover rows, inputs fill, subtle panels |
| `--border` | `#E3E9E6` | Card and input borders |
| `--border-strong` | `#CBD5D0` | Dividers, focused-neutral |
| `--text` | `#14201C` | Primary text |
| `--text-muted` | `#5B6B65` | Secondary text, labels |
| `--text-faint` | `#8A9892` | Placeholders, captions |
| `--primary-50` | `#ECFDF5` | Active nav bg, selected row |
| `--primary-100` | `#D1FAE5` | Soft badges |
| `--primary-500` | `#10A37F` | Charts, icons |
| `--primary-600` | `#0B8A6B` | **Primary buttons, links** |
| `--primary-700` | `#0A7058` | Button hover |
| `--primary-900` | `#064E3B` | Sidebar dark variant |
| `--accent-500` | `#F59E0B` | Highlights, pending |
| `--success` | `#16A34A` | Completed, paid |
| `--warning` | `#D97706` | Low stock, due soon |
| `--danger` | `#DC2626` | Overdue, errors, destructive |
| `--info` | `#2563EB` | Informational only |

### 3.2 Dark theme

| Token | Hex |
| --- | --- |
| `--bg` | `#0C1311` |
| `--surface` | `#131C19` |
| `--surface-2` | `#1A2521` |
| `--border` | `#243230` |
| `--border-strong` | `#33443F` |
| `--text` | `#E8F0EC` |
| `--text-muted` | `#9DB0A8` |
| `--text-faint` | `#6B7E76` |
| `--primary-50` | `#0F2A22` |
| `--primary-600` | `#2DD4A4` |
| `--primary-700` | `#5EEAC0` |

### 3.3 Rules

- 60% neutral, 30% surfaces, **10% primary**. Do not color every icon tile differently.
- All KPI icons use the **same** soft primary tile (`primary-50` bg, `primary-600` icon). Use status colors only for status.
- Status colors always come with an icon or text, never color alone.
- Text contrast must meet WCAG AA (4.5:1).

---

## 4. Design tokens (copy into `src/index.css`)

```css
:root {
  --bg: #F6F8F7;
  --surface: #FFFFFF;
  --surface-2: #F0F4F2;
  --border: #E3E9E6;
  --border-strong: #CBD5D0;
  --text: #14201C;
  --text-muted: #5B6B65;
  --text-faint: #8A9892;

  --primary-50: #ECFDF5;
  --primary-100: #D1FAE5;
  --primary-500: #10A37F;
  --primary-600: #0B8A6B;
  --primary-700: #0A7058;
  --primary-900: #064E3B;

  --accent-500: #F59E0B;
  --success: #16A34A;
  --warning: #D97706;
  --danger: #DC2626;
  --info: #2563EB;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  --shadow-xs: 0 1px 2px rgba(16, 32, 28, 0.05);
  --shadow-sm: 0 1px 3px rgba(16, 32, 28, 0.08), 0 1px 2px rgba(16, 32, 28, 0.04);
  --shadow-md: 0 6px 16px rgba(16, 32, 28, 0.08);
  --shadow-lg: 0 16px 40px rgba(16, 32, 28, 0.12);

  --ring: 0 0 0 3px rgba(11, 138, 107, 0.25);
}

.dark {
  --bg: #0C1311;
  --surface: #131C19;
  --surface-2: #1A2521;
  --border: #243230;
  --border-strong: #33443F;
  --text: #E8F0EC;
  --text-muted: #9DB0A8;
  --text-faint: #6B7E76;
  --primary-50: #0F2A22;
  --primary-600: #2DD4A4;
  --primary-700: #5EEAC0;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 6px 16px rgba(0, 0, 0, 0.45);
  --ring: 0 0 0 3px rgba(45, 212, 164, 0.3);
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

### Tailwind config mapping

```ts
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          900: 'var(--primary-900)',
        },
        accent: 'var(--accent-500)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      borderRadius: { sm: '6px', md: '10px', lg: '14px', xl: '20px' },
      boxShadow: {
        xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)', lg: 'var(--shadow-lg)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
}
```

---

## 5. Typography

**Font:** Inter (load weights 400, 500, 600, 700). Enable `font-feature-settings: 'tnum'` (tabular numbers) on all money, counts and table numbers so ₹ values align.

| Style | Size / Line | Weight | Use |
| --- | --- | --- | --- |
| Display | 30 / 38 | 700 | Page greeting only |
| H1 | 24 / 32 | 600 | Page title |
| H2 | 18 / 28 | 600 | Card and section titles |
| H3 | 15 / 24 | 600 | Sub-sections |
| Body | 14 / 22 | 400 | Default text |
| Body-sm | 13 / 20 | 400 | Table cells, helper text |
| Label | 12 / 16 | 500 | Form labels, KPI labels (sentence case, **not** ALL CAPS) |
| KPI value | 28 / 34 | 700 | Dashboard numbers |

Rules: sentence case everywhere, max line length 70 characters for paragraphs, never use more than 3 font sizes in one card.

---

## 6. Spacing, grid and elevation

- **4px base unit.** Allowed spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Card padding: **20px** (24px on desktop ≥1280).
- Gap between cards: **16px** (20px on desktop).
- Page padding: 24px desktop, 16px mobile.
- Page max content width: **1440px**, centered.
- Cards: `bg-surface border border-border rounded-lg shadow-xs`. On hover (only if clickable): `shadow-md` + `-translate-y-px`.
- Modals/drawers: `shadow-lg`, `rounded-xl`.
- Use borders for structure, shadows for elevation. Never both heavy.

---

## 7. App layout

```
┌────────────┬───────────────────────────────────────────┐
│            │  Top bar (64px): breadcrumb · search ·    │
│  Sidebar   │  date · + New · bell · theme · avatar     │
│  264px     ├───────────────────────────────────────────┤
│            │  Page header: title + subtitle + actions   │
│ collapsible│  Content area (scrolls)                    │
│  to 72px   │                                           │
└────────────┴───────────────────────────────────────────┘
```

### 7.1 Sidebar

- Width **264px**, collapsible to **72px** (icons only with tooltips). Remember the state in localStorage.
- Background: `surface` with right border (light) or `primary-900` (optional dark-green variant for a premium look).
- **Top:** logo mark (rounded square, primary-600, leaf/caduceus icon in white) + "HomeoCare Pro" (16px/600) + clinic name beneath in muted 12px. Remove the tagline.
- **Grouped navigation** with small muted group labels (11px, uppercase allowed only here, letter-spacing 0.06em):
  - **Overview:** Dashboard
  - **Clinic:** Patients, Appointments, Cases, Prescriptions, Follow-ups
  - **Operations:** Inventory, Billing
  - **Tools:** Search
- Every item has a **20px Lucide icon** (LayoutDashboard, Users, CalendarDays, FolderHeart / ClipboardList, Pill, BellRing, Boxes, Receipt, Search).
- Item: height 40px, padding `0 12px`, radius 10px, gap 12px, margin `0 12px` (so it never touches the edges).
  - Default: text-muted, icon faint.
  - Hover: `surface-2` bg, text color.
  - **Active:** `primary-50` bg, `primary-700` text, 3px primary-600 indicator bar on the left (rounded), icon primary-600, weight 600.
- Badge counts on right (Follow-ups due, Low stock) in small pill: `bg-warning/15 text-warning`.
- **Bottom:** user card (avatar with initials, name, role) that opens a menu: Profile, Settings, Clinic settings, Keyboard shortcuts, **Logout**. Remove the red full-width Logout button. Logout becomes a menu item with a `LogOut` icon.

### 7.2 Top bar

- Height 64px, `bg-surface/80 backdrop-blur`, bottom border.
- Left: breadcrumb (Dashboard / Patients / Ravi Kumar). Do not repeat the page title here.
- Center/right: search field (width 360px, `surface-2` fill, no border until focus, `⌘K` / `Ctrl K` hint) that opens a **command palette**.
- Right: today's date chip ("Tue, 17 Nov"), **+ New** dropdown (New patient, New appointment, New prescription, New bill), notification bell with dot, theme toggle, avatar.
- Remove the floating date/time box at the bottom right.

### 7.3 Page header (inside content)

- H1 title, muted subtitle one line, actions on the right (primary button + secondary buttons).
- Spacing: 24px below the header.

---

## 8. Dashboard redesign

### 8.1 Structure (top to bottom)

1. **Greeting row** – "Good evening, Dr. {Name}" (Display) + subtitle "You have 0 appointments today." Right side: `Refresh` icon button, `New appointment` primary button.
2. **KPI row** – 4 cards in one row (2 on tablet, 1 on mobile): Today's appointments, Pending follow-ups, Active cases, Monthly revenue. Total patients and Prescriptions move into a secondary "Clinic overview" strip or the charts. Low-stock gets its own alert banner (below).
3. **Alert banner** (only when stock alerts > 0): `warning` soft bg, icon, "3 medicines are running low", link "View inventory". Hide it completely at 0.
4. **Two-column work area (8/4 split):**
   - Left (8 cols): **Today's schedule** timeline/table (time, patient, reason, status chip, quick actions).
   - Right (4 cols): **Follow-ups due** list (patient, due date, call/WhatsApp button) and **Quick actions** card.
5. **Analytics row** – Patient growth (area), Monthly visits (bar), Revenue trend (area), Follow-up success rate (donut). 2×2 grid on desktop.

### 8.2 KPI card spec

- Height auto (min 124px), padding 20px.
- Top row: label (Label style, muted) left; 36px icon tile right (`primary-50` bg, radius 10px, icon 18px `primary-600`).
- Value: KPI style, tabular nums. Money as `₹0` with thousands grouping in `en-IN` (e.g. ₹1,24,500).
- Footer: **only if previous-period data exists** → delta chip (`+12%` success, `-3%` danger, with arrow icon) + "vs last month" in faint text. Otherwise show a faint helper text ("No visits yet today").
- Optional 80×28px sparkline at the bottom right in `primary-500`.
- Clickable: whole card navigates to its module.

### 8.3 Empty states (replace every "No data available")

Centered inside the card, min-height 220px:

- 48px muted illustration/icon in a soft circle (`surface-2`)
- Title (15px/600): "No visits recorded yet"
- Description (13px muted): "Visits will appear here once you add appointments."
- Secondary button: "Add appointment"

For charts with no data, you may also show a **ghost chart** (light grey placeholder line/bars at 30% opacity) behind the message so the card keeps its shape.

### 8.4 Chart style (Recharts)

- Colors: primary-500 for the main series, `accent-500` for a second series, grey `#CBD5D0` for comparison. Max 3 series.
- No heavy grid: horizontal dashed lines only, stroke `var(--border)`.
- Axis text 12px `text-faint`, no axis lines.
- Area fill gradient: primary-500 at 20% → 0%.
- Tooltip: `surface` bg, border, `shadow-md`, radius 10px, 12px text.
- Rounded bar tops (radius 6px), bar width max 28px.
- Card header: title left, range selector (7d / 30d / 12m segmented control) right.

---

## 9. Components

### 9.1 Buttons

| Variant | Style |
| --- | --- |
| Primary | `bg-primary-600 text-white hover:bg-primary-700`, radius 10px, shadow-xs |
| Secondary | `bg-surface border border-border text-text hover:bg-surface-2` |
| Ghost | transparent, `hover:bg-surface-2` |
| Danger | `bg-danger text-white` – only for destructive confirmations |
| Soft | `bg-primary-50 text-primary-700` |

Sizes: sm 32px, md 40px (default), lg 44px. Padding `0 16px`. Icon left, 16px, gap 8px. Focus: `--ring`. Disabled: 50% opacity, `cursor-not-allowed`. Loading: spinner replaces icon, label stays.

Only **one primary button per view**.

### 9.2 Form fields

- Label above (12px/500), helper text below (12px muted), error text (12px danger) with icon.
- Input: height 40px, `bg-surface border border-border rounded-md px-3`, placeholder faint.
- Focus: border `primary-600` + `--ring`.
- Error: border danger + ring in danger 20%.
- Group long forms (Patient registration) into cards: *Personal details*, *Contact*, *Medical background*, *Notes*. Two columns on desktop, one on mobile.
- Sticky footer bar with Save / Cancel on long forms.
- Required fields: small red asterisk after the label.

### 9.3 Tables (Patients, Billing, Inventory)

- Wrapper card with toolbar: search, filter chips, column toggle, export, primary "Add" button.
- Header row: `surface-2` bg, 12px/600 muted text, sentence case, sticky.
- Row height 52px, divider `border`, hover `surface-2`, selected `primary-50`.
- First column: avatar (32px initials) + name (500) + secondary line (phone/ID, muted 12px).
- Status column uses **badges** (see 9.4). Actions column: kebab menu, visible on row hover.
- Footer: "Showing 1–10 of 124" + pagination. Rows per page selector.
- Mobile: convert rows to stacked cards.
- Loading: skeleton rows. Empty: empty-state component with CTA.

### 9.4 Badges / status chips

Height 24px, padding `0 8px`, radius 999px, 12px/500, leading 6px dot.

| Status | Colors |
| --- | --- |
| Scheduled | primary-50 bg / primary-700 text |
| Completed / Paid | success 12% bg / success text |
| Pending / Due soon | warning 14% bg / warning text |
| Overdue / Cancelled | danger 12% bg / danger text |
| Draft / Inactive | surface-2 bg / muted text |

### 9.5 Modals and drawers

- Use **right-side drawers (480–640px)** for create/edit patient, prescription, follow-up. Use centered modals (max 480px) only for confirmations.
- Overlay `rgba(12,19,17,0.5)` with 4px blur. Radius xl. Header with title + close icon, footer with actions.
- Close on Esc and overlay click (except forms with unsaved changes).

### 9.6 Toasts

Bottom-right, 360px, `surface` bg, border, shadow-lg, left 3px color bar by type, auto-dismiss 4s, with Undo where possible.

### 9.7 Tabs and segmented controls

Underline tabs for page sections (2px primary-600 underline). Segmented control (surface-2 track, white pill active) for range selectors.

### 9.8 Loading

Use **skeleton shimmer** matching the final layout. Never show a lone "Refreshing..." text. Use a top 2px progress bar for route changes.

---

## 10. Module-specific guidance

| Module | Key UX improvements |
| --- | --- |
| **Patients** | Table with avatar, age/gender, last visit, next follow-up chip, tags. Patient detail page with header card (photo, ID, phone, quick actions: Call, WhatsApp, New case, New prescription) and tabs: Overview · Cases · Prescriptions · Follow-ups · Billing · Documents. |
| **Appointments** | Week/day calendar view with a list toggle; color by status, drag to reschedule; mini calendar on the left. |
| **Cases** | Timeline of visits (newest first), chief complaints as chips, remedy and potency highlighted in a soft primary panel. |
| **Prescriptions** | Structured rows: Remedy · Potency · Dose · Frequency · Duration. Print/PDF preview on the right with clinic letterhead. |
| **Follow-ups** | Grouped lists: Overdue (danger), Today, This week. One-tap Call / WhatsApp / Mark done. |
| **Inventory** | Stock level bar per medicine (green/amber/red), low-stock filter chip, reorder button. |
| **Billing** | Invoice table with paid/unpaid chips, totals summary strip (Collected, Pending), receipt preview. |
| **Search** | Merge into the command palette (Ctrl+K) and keep a full results page as an optional tab. |

---

## 11. Motion and interaction

- Durations: 120ms (hover), 200ms (menus, tabs), 280ms (drawers). Easing `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Page transition: fade + 4px upward slide, 200ms.
- Cards fade in with a 40ms stagger on first load.
- Respect `prefers-reduced-motion`: disable transforms and shimmer.
- Keyboard: `Ctrl/⌘ K` search, `N` new patient, `G` then `D/P/A` for navigation, `Esc` closes overlays.

---

## 12. Responsive behavior

| Breakpoint | Behavior |
| --- | --- |
| ≥1280 | Full sidebar, 4-column KPIs |
| 1024–1279 | Sidebar collapses to 72px, 2-column KPIs |
| 640–1023 | Sidebar becomes an overlay drawer opened from a hamburger, 2-column KPIs |
| <640 | Bottom tab bar (Dashboard, Patients, Appointments, Follow-ups, More), single column, drawers become full-screen sheets |

Touch targets minimum 44×44px on mobile. This is a PWA, so also set `theme-color` to `#0B8A6B` and use maskable icons.

---

## 13. Accessibility checklist

- Contrast AA for all text and icons.
- Visible focus ring on every interactive element (`--ring`).
- Semantic landmarks: `nav`, `main`, `header`; `aria-current="page"` on the active nav item.
- Icon-only buttons need `aria-label`; tooltips on collapsed sidebar.
- Forms: labels linked to inputs, errors announced with `aria-live="polite"`.
- Never rely on color alone for status.
- Support light, dark and system theme.

---

## 14. Content and copy rules

- Sentence case, short verbs: "Add patient", "Save prescription".
- Currency: `₹` with `en-IN` grouping. Dates: `17 Nov 2026`. Time: 12-hour `7:29 PM`.
- Friendly empty-state text, specific error messages ("Phone number must be 10 digits").
- No placeholder metrics, no lorem ipsum, no fake percentages.

---

## 15. Suggested libraries

- **Icons:** `lucide-react`
- **Primitives:** shadcn/ui (Radix) for Dialog, Dropdown, Tabs, Tooltip, Command palette (`cmdk`), Sheet
- **Charts:** Recharts
- **Tables:** TanStack Table
- **Dates:** date-fns
- **Toasts:** sonner
- **Font:** `@fontsource-variable/inter`

---

## 16. Implementation order for Kiro

1. Add tokens to `index.css` and the Tailwind config (section 4), install Inter and Lucide.
2. Build `AppShell` (sidebar + top bar + page header) from section 7.
3. Build shared components: Button, Input, Badge, Card, EmptyState, Skeleton, Drawer, Toast, DataTable.
4. Rebuild the Dashboard using section 8.
5. Restyle Patients, then Appointments, Cases, Prescriptions, Follow-ups, Inventory, Billing, Search with section 9 and 10.
6. Add dark mode, responsive behavior and accessibility pass.

---

## 17. Ready-to-paste prompt for Kiro

> Redesign the entire UI of HomeoCare Pro using the attached style guide. Keep all existing functionality and data logic unchanged; change only presentation. First replace all hard-coded colors with the CSS variables and Tailwind tokens from section 4. Then rebuild the app shell (grouped sidebar with Lucide icons, collapsible, user menu with logout, top bar with breadcrumb, command-palette search, date chip and a "+ New" menu). Rebuild the dashboard per section 8: greeting row, four KPI cards that hide delta percentages when there is no previous data, today's schedule, follow-ups due, quick actions, and Recharts charts with proper empty states instead of "No data available". Create reusable components (Button, Input, Badge, Card, EmptyState, Skeleton, Drawer, DataTable) and apply them across every module. Support light and dark themes, responsive layouts, keyboard shortcuts and WCAG AA accessibility. Do not use default Tailwind blue anywhere; the primary color is `#0B8A6B`.

---

## 18. Reference designs (visual source of truth)

The approved screen designs live on the design canvas: https://claude.ai/artifact/BwwiwNFKXsjPHsPUVEjoWj

It contains Dashboard, Patients, Appointments, New prescription and Billing. **Every other screen (Cases, Follow-ups, Inventory, Search, Settings, Login) must be built from the same patterns below, so the whole application looks like one product.**

### 18.1 Shared shell (identical on every screen)

- Sidebar 248px, white, right border `#E3E9E6`; logo mark 36px in `#0B8A6B`; grouped nav (Overview, Clinic, Operations) with 18px stroke icons; active item `#ECFDF5` bg, `#0A7058` text, weight 600; user card pinned to the bottom with a menu (no red Logout button).
- Top bar 64px white: breadcrumb left, search with Ctrl K hint, date chip, primary `+ New` button.
- Content: 32px padding, max width 1440px, 20px gap between blocks, page header (H1 28px/700 + muted subtitle + one primary button on the right).

### 18.2 Pattern per screen type

| Screen type | Pattern | Used by |
| --- | --- | --- |
| Dashboard | Greeting, 4 KPI cards, schedule card + quick actions, chart cards with ghost-chart empty states | Dashboard |
| List / table | One card with toolbar (search, filter chips, export) above a table with `#F0F4F2` header, 52px rows, avatar + name cell, status badges, footer with count and rows per page | Patients, Cases, Follow-ups, Inventory, Billing |
| Schedule | Day selector pills, Day/Week/List toggle, time rows with mint appointment blocks and dashed free slots | Appointments |
| Form | Two-column: grouped cards on the left, live preview on the right, Cancel and Save aligned right at the bottom | Prescriptions, New patient, New case, New invoice |
| Summary strip | 3–4 KPI cards above a table | Billing, Inventory |

### 18.3 Status badge colors (use everywhere)

| Meaning | Background | Text |
| --- | --- | --- |
| Active, paid, confirmed | `#ECFDF5` | `#0A7058` |
| Pending, due soon, waiting | `#FEF3C7` | `#92400E` |
| Overdue, cancelled, urgent | `#FEE2E2` | `#B91C1C` |
| Inactive, draft, scheduled | `#F0F4F2` | `#4B5B55` |

### 18.4 Accessible text colors

Use `#14201C` for primary text and `#5B6B65` for secondary text. Do not use `#8A9892` for text (it fails contrast); keep it for decorative icons only.

### 18.5 Instruction to Kiro

> Open the canvas link and match its layout, spacing, colors and components exactly. Reuse one `AppShell`, one `PageHeader`, one `DataTable`, one `Badge`, one `EmptyState` and one `FormCard` across all modules. For screens not shown on the canvas, compose them from these same components; do not introduce new colors, radii or shadows.
