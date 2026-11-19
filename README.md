# HomeoCare Pro - Homeopathy Clinic Management System

A comprehensive homeopathy clinic management web application for doctors managing small to medium clinics. Supports up to 10,000+ patients with offline-first architecture.

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
- **Offline-First** - IndexedDB caching with automatic sync when online
- **Dark Mode** - Clinic-grade dark theme support

## Tech Stack

- **Frontend**: React 18, TypeScript (strict), Vite, Tailwind CSS
- **UI Library**: react-typescript-ui
- **Rich Text Editor**: react_typescript_editor
- **Routing**: React Router
- **State Management**: React Query + IndexedDB
- **Backend**: Google Apps Script
- **Database**: Google Sheets (primary) + IndexedDB (cache)
- **Documents**: Google Drive
- **Build**: PWA support with service worker

## Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud account (for Apps Script and Sheets)
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

No `.env` file is needed. The app works fully offline out of the box.

To connect Google Apps Script and Google Sheets, sign in as `admin` and open
**Settings > Google connection**. Enter the Apps Script web-app URL and the Google
Sheets data URL, then press **Save connection**. The addresses are stored in that
browser and take effect immediately. Leave both empty to stay offline only.

## Setup Guide

### 1. Google Sheet Setup

1. Create a new Google Sheet at https://sheets.google.com
2. Create the following sheets (tabs):
   - **Patients**: PatientID, FullName, Photo, DOB, Age, Gender, MaritalStatus, Occupation, Mobile, WhatsApp, Email, Street, City, State, Pincode, Height, Weight, BMI, BloodGroup, EmergencyContact, RegistrationDate, CreatedAt, CreatedBy
   - **Appointments**: AppointmentID, PatientID, Date, StartTime, EndTime, Type, Status, Notes, CreatedAt, CreatedBy
   - **CaseHistory**: CaseID, PatientID, VisitDate, ChiefComplaints, MentalSymptoms, PhysicalGenerals, FoodPreferences, Notes, CreatedAt, CreatedBy
   - **Prescriptions**: PrescriptionID, PatientID, CaseID, Medicine, Potency, Dosage, Frequency, Duration, Notes, CreatedAt, CreatedBy
   - **FollowUps**: FollowUpID, PatientID, CaseID, VisitDate, Symptoms, ImprovementPercent, Aggravation, NewSymptoms, Status, Notes, CreatedAt, CreatedBy
   - **Inventory**: InventoryID, Name, BatchNumber, ExpiryDate, Quantity, Vendor, UnitPrice, CreatedAt
   - **Billing**: BillingID, PatientID, CaseID, AppointmentID, ConsultationFee, MedicineCharges, FollowUpCharges, TotalAmount, PaymentStatus, PaymentMethod, Notes, CreatedAt
   - **Users**: UserID, Username, PasswordHash, Role, Email, CreatedAt
   - **AuditLogs**: AuditID, Action, EntityType, EntityID, UserID, Timestamp, Details
   - **Settings**: SettingKey, SettingValue, Description

3. Copy the Sheet ID from the URL (the long string between `d/` and `/edit`)
4. Share the sheet with the Apps Script account

### 2. Google Apps Script Setup

1. Go to https://script.google.com
2. Create a new project
3. Copy all files from `apps-script/` folder to the Apps Script editor
4. Deploy as Web App:
   - Click "Deploy" → "New Deployment"
   - Select type "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone with Google account"
   - Click "Deploy"
5. Copy the deployment URL (looks like `https://script.google.com/macros/s/...`)
6. Sign in as `admin`, open **Settings > Google connection**, paste this URL into **Apps Script web-app URL** and press **Save connection**

### 3. Enable Google Sheets API

1. Go to https://console.cloud.google.com
2. Create a new project or select existing one
3. Enable "Google Sheets API" and "Google Drive API"
4. Create credentials (Service Account or OAuth client)
5. Share your Google Sheet with the service account email

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
3. Results appear instantly from IndexedDB cache

### Offline Mode

When offline:

- Create/edit/view patients, cases, prescriptions, follow-ups
- Operations save to IndexedDB queue
- Auto-sync when internet becomes available
- Dashboard shows cached data

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
├── apps-script/              # Google Apps Script backend
│   ├── Code.gs              # Main entry point
│   ├── services/            # Service modules
│   └── controllers/         # API controllers
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

### Apps Script Returns 403

- Ensure Apps Script is deployed as "Anyone with Google account"
- Check CORS settings in `Code.gs`
- Verify the Apps Script web-app URL in **Settings > Google connection**

### Sheet Data Not Loading

- Verify the Google Sheets data URL in **Settings > Google connection**
- Ensure sheet is shared with Apps Script account
- Check browser console for errors

### IndexedDB Not Working

- Check browser supports IndexedDB (all modern browsers do)
- Clear browser cache and reload
- Check DevTools Application tab for database

### Build Fails with TypeScript Errors

- Run `npx tsc --noEmit` to see errors
- Fix type errors before rebuilding
- Check `tsconfig.json` for configuration

## Contributing

1. Create a new branch for your feature
2. Make changes with clear commit messages
3. Run `npm run build` to verify
4. Test offline mode if changes affect data layer
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
