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

- **One search, one box per screen.** The box in the app bar finds a patient by name, mobile, UHID,
  ABHA (address or number) or bill number (`/` focuses it). Results show each patient's ABHA and
  status icons. It steps aside while a task panel is open and on Guest Pass, MLC and Enquiry, which
  have their own patient field. A patient who isn't found can be registered from **Register Patient**,
  with what was typed already filled in.
- **Registration takes only real values.** A name in letters; age 0–130, with 100 and over shown
  in red and confirmed again; sex; an Indian mobile (10 digits starting 6–9); an optional ABHA,
  checked for format and not already linked to someone else.
- **The profile is the hub.** `/patients/:uhid` shows who the patient is, their ABHA, what they owe,
  where they are and what has happened at the desk. Everything done for a patient starts there:
  Schedule · Admit or Discharge · Billing, and Reschedule or Cancel on a booking.
- **Icons beside every name:** ICU (red heart), Emergency (red siren), inpatient (blue bed),
  outpatient today (teal stethoscope), teleconsult today (purple video).
- **Tasks are flows, not pages.** Each task opens over the current page as a panel held in the URL
  (`?flow=schedule|reschedule|admit|discharge|billing`, plus `uhid`, `doctor`, `appointment`,
  `bill` and the like). Browser Back or Esc closes it, and a link with `?flow=` opens straight into
  it. Each flow ends with a short acknowledgement and closes itself. Old addresses
  (`/appointments`, `/op-queue`, `/appointments/new`, `/admissions/discharge`, `/payments/pending`, …)
  redirect to the matching place or flow; `?flow=consult` (the old Start Consultation) opens Schedule.
- **Schedule, one step at a time — the one way to see a doctor:** department → that department's
  doctors → when: **now**, as a walk-in with a queue token, if the doctor is seeing patients, or a
  time to book (in person or teleconsult, where the doctor offers both) → confirm and pay → "Token
  Issued" or "Appointment Confirmed". Nothing is chosen for the desk.
- **Outpatients** is one page for bookings, walk-ins and the queue: to check in → waiting → with the
  doctor → done, plus bookings ahead. Each figure is also its filter; Teleconsult narrows them all.
- **Reschedule, cancel, no-show.** A cancellation asks who can't make it. If the doctor is
  unavailable the patient is refunded in full; if the patient cancels or doesn't come (no-show,
  10 minutes after the booked time) the fee is kept. A move keeps the booking and its history and
  never refunds; a patient who moves to a dearer doctor pays the difference, while a doctor's move
  absorbs it. Doctor leave on a booked day first moves or cancels that day's bookings.
- **Cashless, no pay-later.** Payment is UPI or card, and staff confirm what the phone or terminal
  shows. A booking or token is saved only once it is paid. A refund is always in full, by the
  methods the money came in. An inpatient's running bill accrues daily and can be part-paid.
  Insured, TPA and corporate stays are settled by their payer at discharge. A discharge needs the
  stay's bill at ₹0.
- **The dashboard** has five figures, each opening its place — outpatients today, waiting,
  inpatients, due, registered today — then today's outpatients, what needs attention, the
  self-registration form to share, recent activity and the doctors now.
- **Patient self-registration** can be shared from the dashboard and the Register page: QR code,
  Open form, Copy link, or WhatsApp / SMS to the patient's mobile. The form is a preview for now —
  answers stay on the patient's phone — so the desk registers the patient on arrival.
- **Places in the sidebar:** Dashboard · Patients · Outpatients · Inpatients · Billing · Doctors ·
  Services (Guest Pass, Enquiry & Estimate, MLC). The SHRI Health mark leads to
  https://shri-ai.org/dev/. The name card at the top right switches between the desk's staff.

There is no backend. The store is in memory and starts from sample data
(`front-office/src/domain/seedData.ts`, `admissionSeedData.ts`):
- 31 patients across every desk function: the queue, bookings, teleconsults, cancellations (by the
  patient and by the doctor), moved bookings (one with a fee difference), inpatients, beds awaited,
  discharges, every bill status, guest passes, MLC, estimates and a possible duplicate.
- The data is generated relative to the time the app opens, so it reads like a shift in progress at
  any hour.
- A reload starts it fresh.
