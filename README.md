# care-entry
SHRI HEALTH Care Entry Portal — Front Office and Patient Self-Registration in **one** application.

## Run it

```bash
npm install
npm run dev
```

Open **http://localhost:5173/** (Vite uses the next free port if 5173 is busy; the exact address is printed).
That is the Care Entry dashboard. The patient self-registration portal is at `/patient-self-registration`
on the same address. There is no second server, terminal or port.

The shared build is live at **https://shri-ai.org/dev/care-entry/**. A build for a sub-path takes the
path as `BASE_PATH`, e.g. `BASE_PATH=/dev/care-entry/ npm run build`.

| Command | What it does |
|---|---|
| `npm run dev` | Development server (Front Office + Patient Self-Registration) |
| `npm run build` | Type-checks both apps and builds one site into `front-office/dist/` |
| `npm run preview` | Serves that production build at http://localhost:4173/ |
| `npm run lint` | Lints both apps |

## Layout

```
front-office/                 Front Office app (React + Vite + TypeScript) — also the host/server
  patient-self-registration/  entry pages that mount the portal at /patient-self-registration
patient-self-registration/    Patient Self-Registration app (its own source, unchanged)
```

Both are npm workspaces of this repository. The portal's source stays in `patient-self-registration/`;
`front-office/vite.config.ts` serves and builds it together with Front Office. To deploy, publish
`front-office/dist/` as one static site (the host must serve `/patient-self-registration` — with or
without a trailing slash — from `dist/patient-self-registration/index.html`).

Both apps open in the **light** theme by default; the dark theme stays available through each app's theme switch.

## How the front office works

- **One search.** The box in the app bar finds a patient by name, mobile, UHID, ABHA or bill number
  (`/` focuses it). An empty box offers the most recently registered and most opened patients. A
  patient who isn't found can be registered from the same place, with what was typed already filled in.
- **The profile is the hub.** `/patients/:uhid` shows who the patient is, what they owe, where they
  are admitted and what has happened at the desk. Everything done for a patient starts there:
  Schedule · Start Consultation · Admit or Discharge · Billing.
- **Tasks are flows, not pages.** Each task opens over the current page as a panel held in the URL
  (`?flow=schedule|consult|admit|discharge|billing`, plus `uhid`, `bill` and the like). Browser Back
  or Esc closes it, and a link with `?flow=` opens straight into it. Each flow ends with a short
  acknowledgement and closes itself. Old addresses (`/appointments/new`, `/admissions/discharge`,
  `/payments/pending`, …) redirect into the matching flow or place.
- **Cashless, no pay-later.** Payment is UPI or card, and staff confirm what the phone or terminal
  shows. A booking or token is saved only once it is paid. An inpatient's running bill accrues daily
  and can be part-paid. Insured, TPA and corporate stays are settled by their payer at discharge. A
  discharge needs the stay's bill at ₹0.
- **Places in the sidebar:** Dashboard · Patients · Outpatients (Appointments, Queue) · Inpatients ·
  Billing · Doctors · Services (Guest Pass, Enquiry & Estimate, MLC).

There is no backend. The store is in memory and starts from sample data
(`front-office/src/domain/seedData.ts`, `admissionSeedData.ts`):
- 31 patients across every desk function: the queue, bookings, inpatients, beds awaited, discharges,
  every bill status, guest passes, MLC, estimates and a possible duplicate.
- The data is generated relative to the time the app opens, so it reads like a shift in progress at
  any hour.
- A reload starts it fresh.
