# HomeoCare Pro - Homeopathy Clinic Management System

A homeopathy clinic management application whose live data backend is Google Sheets, with patient photos stored in Google Drive. An internet connection and Google authorization are required for clinic data.

## Features

- **Patient Management** - Auto-generated patient IDs (P000001), complete patient profiles with personal, contact, address, and medical details
- **Homeopathy Case Taking** - Chief complaints, mental symptoms, physical generals, food preferences, and rich text notes
- **Prescription Builder** - Medicine, potency, dosage, frequency, duration, PDF generation with professional templates
- **Follow-Up Tracking** - Visit timeline with improvement percentage, status indicators (green/yellow/red)
- **Appointment Management** - Day/Week/Month calendar views with status tracking
- **Inventory Management** - Medicine tracking with batch/expiry management, stock alerts
- **Billing & Reports** - Consultation, medicine, and follow-up charges with revenue reports
- **Dashboard** - KPI cards, charts (patient growth, revenue trends, disease categories), activity feed
- **Search** - Global search by patient name/ID/mobile/medicine/disease
- **Cloud-Only Data** - Reads and writes clinic data directly to Google Sheets; no local record cache or offline queue
- **Dark Mode** - Clinic-grade dark theme support

## Tech Stack

- **Frontend**: React 18, TypeScript (strict), Vite, Tailwind CSS
- **UI Library**: react-typescript-ui
- **Rich Text Editor**: react_typescript_editor
- **Routing**: React Router
- **State Management**: React Query (in-memory cache only)
- **Google integration**: Google Sheets API with Google OAuth
- **Database**: Google Sheets (`HomeoCareData` tab)
- **Documents**: Google Drive
- **Build**: PWA support with service worker

## Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud project (OAuth client and Sheets API)
- Chrome or Edge browser (for PWA)

### Installation

```bash
cd homeocare-pro
npm install
```

### Development Server

```bash
npm run dev
```

The app runs at `http://localhost:5173`

### Build

```bash
npm run build
```

## Configuration

Copy `.env.example` to `.env.local` and configure `VITE_GOOGLE_SHEETS_URL` and
`VITE_GOOGLE_CLIENT_ID`. These are public client configuration; never put an OAuth
client secret in a `VITE_` variable. Each user must connect a Google account that
has access to the configured spreadsheet. The app requires an internet connection
and writes business records directly to Sheets—there is no offline record cache
or deferred sync queue. OAuth access tokens remain in memory and are never written
to the spreadsheet.

## Setup Guide

### 1. Google Sheet Setup

1. Use the spreadsheet URL in `VITE_GOOGLE_SHEETS_URL`; HomeoCare preserves existing tabs.
2. On first authorized access, HomeoCare creates a `HomeoCareData` tab with columns `Collection`, `ID`, `Record JSON`, and `Updated At`.
3. Keep the spreadsheet private and authorize only trusted Google accounts.

Patient, appointment, case, prescription, follow-up, inventory, billing, settings,
prescription template, search-history, and audit-log records are stored in that tab.
Photos are uploaded to Drive and the corresponding Drive file ID is stored in each
patient record. Credentials and OAuth tokens are not stored in Sheets.

### 2. Google OAuth and Sheets API Setup

1. In [Google Cloud Console](https://console.cloud.google.com/), select or create a project and enable the **Google Sheets API** and **Google Drive API**.
2. Configure the OAuth consent screen. While the app is in testing, add the Google account that owns the Sheet as a test user.
3. Create an OAuth client ID of type **Web application**. Add the local app origin (for example, `http://localhost:5173`) to **Authorized JavaScript origins**.
4. Copy `.env.example` to `.env.local`, set `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_SHEETS_URL`, then restart the app.
5. Sign in to HomeoCare and choose **Connect Google**. Grant access to Sheets and Drive when prompted.

After a page reload, HomeoCare automatically requests a fresh Google access token; previously granted consent is reused when the Google account session is available. Tokens remain in memory and are never persisted. If Google requires interaction, select **Connect Google** to reconnect. Legacy browser records can be moved from **Settings > Migrate legacy browser data**; matching IDs overwrite cloud rows. Local records are cleared only after HomeoCare verifies the migrated Sheets rows.

## React Version Note

HomeoCare Pro uses **React 18** as the primary version. The rich text editor (`react_typescript_editor` v0.4.5) declares React 19 as a peer dependency, but the app works correctly with React 18. If you see peer dependency warnings during installation, use:

```bash
npm install --legacy-peer-deps
```

The app is fully functional with React 18 and the editor integration works as expected.

## Usage

### Authentication

1. Open the app at `http://localhost:5173`
2. Enter username and password
3. Select role: Doctor, Receptionist, or Admin
4. Click "Login"

### Role-Based Access

- **Doctor**: Full access to all features
- **Receptionist**: Patient registration and appointments only
- **Admin**: All clinic settings and system configuration

### Patient Registration

1. Navigate to "Patients" → "Add New Patient"
2. Fill in personal, contact, address, and medical details
3. Upload photo (optional)
4. Click "Save"

### Case Taking

1. Navigate to a patient's detail page
2. Click "New Case"
3. Fill in chief complaints, mental symptoms, physical generals, food preferences
4. Use rich text editor for notes with slash commands:
   - Type `/case` to insert case note headings
   - Type `/followup` to insert follow-up headings
5. Click "Save Case"

### Prescriptions

1. Navigate to a patient's detail page
2. Click "New Prescription"
3. Select medicine from dropdown or type custom medicine
4. Enter potency, dosage, frequency, duration
5. Add notes in rich text editor
6. Click "Generate PDF" to download prescription
7. Click "Save Prescription"

### Follow-Ups

1. Navigate to a patient's detail page
2. Click "New Follow-Up"
3. Enter symptoms, improvement percentage, aggravation, new symptoms
4. Select status: Improved (green), Stable (yellow), or Worse (red)
5. Click "Save Follow-Up"

### Dashboard

The dashboard shows:

- KPI cards: Total patients, today's appointments, pending follow-ups, active cases, monthly revenue, medicine stock alerts
- Charts: Patient growth, monthly visits, revenue trend, disease categories, follow-up success rate
- Activity feed: Recent patient registrations, appointments, prescriptions, follow-ups

### Search

1. Click the search icon in the header
2. Type patient name, ID, mobile, medicine, or disease
3. Results are queried directly from Google Sheets.

### Offline behavior

Clinic data cannot be viewed or changed offline. Changes are sent directly to
Google Sheets and are not queued or cached on the device.

## Building for Production

```bash
npm run build
```

The build output is in the `dist/` folder.

Deploy the `dist/` folder to your hosting provider (Netlify, Vercel, GitHub Pages, etc.).

## Project Structure

```
homeocare-pro/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Main app component
│   ├── types/                # TypeScript interfaces
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API clients
│   ├── components/           # Shared components
│   ├── features/             # Feature modules
│   │   ├── auth/            # Authentication
│   │   ├── dashboard/       # Dashboard
│   │   ├── patients/        # Patient management
│   │   ├── cases/           # Case taking
│   │   ├── prescriptions/   # Prescription builder
│   │   ├── followups/       # Follow-up tracking
│   │   ├── appointments/    # Appointment management
│   │   ├── inventory/       # Inventory management
│   │   ├── billing/         # Billing & reports
│   │   ├── search/          # Search system
│   │   └── settings/        # Clinic settings
│   ├── routes/               # Route definitions
│   └── utils/                # Utility functions
├── public/                   # Static assets
├── dist/                     # Build output
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Development

### Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # Lint code
npm run test      # Run tests (if configured)
```

### TypeScript Configuration

Strict mode enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Troubleshooting

### Google OAuth or Sheets API errors

- Ensure the Google Sheets API is enabled in the Cloud project used by the OAuth client.
- Ensure the Google Drive API is enabled for patient photo uploads.
- Add the local app origin (for example, `http://localhost:5173`) to the OAuth client’s authorized JavaScript origins.
- If the OAuth consent screen is in testing, add the Google account that owns the Sheet as a test user.
- Confirm `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_SHEETS_URL` are set in `.env.local`, then restart the dev server.
- Confirm the account authorizing HomeoCare has access to the Sheet and has granted the requested scopes.

### Sheet Data Not Loading

- Reconnect Google from the access prompt or **Settings > Google connection**.
- Confirm the `HomeoCareData` tab has the expected four headers. HomeoCare creates
  this tab automatically; do not rename its columns.
- Check that the signed-in Google account has access to the configured spreadsheet
  and that both Google APIs are enabled.

### Build Fails with TypeScript Errors

- Run `npx tsc --noEmit` to see errors
- Fix type errors before rebuilding
- Check `tsconfig.json` for configuration

## Contributing

1. Create a new branch for your feature
2. Make changes with clear commit messages
3. Run `npm run build` to verify
4. Verify reads and writes while connected to Google Sheets
5. Update this README if needed

## License

MIT


## Deploying to Cloudflare (Workers Builds, from Git)

1. Cloudflare dashboard > **Workers & Pages** > **Create** > **Import a repository**, pick this repo.
2. Build command: `npm run build`
3. Deploy command: `npx wrangler deploy`
4. Root directory: leave empty (repo root).

`wrangler.jsonc` serves `dist/` and falls back to `index.html` for client-side routes.
`.node-version` pins Node 22 and `.npmrc` sets `legacy-peer-deps=true` (react_typescript_editor declares a
React 19 peer dependency while the app runs React 18).

If you use Cloudflare **Pages** instead: build command `npm run build`, output directory `dist`
(delete `wrangler.jsonc` if Pages complains about it).
