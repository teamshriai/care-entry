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

## Design system

Both apps follow [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) and share **one** token stylesheet,
[`shared/design-system.css`](shared/design-system.css): colours (light and dark), the type scale,
radius, shadows, motion, focus, touch-target and print rules, and the Plus Jakarta Sans + Noto fonts.
Each app's `src/index.css` imports it and adds only its own keyframes. Components use tokens only
(`bg-surface-1`, `text-ink-muted`, `text-primary-text` …), never raw hex.

- **Navigation.** From 1024px a sidebar that collapses to an icon rail (the choice is remembered);
  768–1023px the icon rail; below 768px a bottom bar — Front Office keeps the rest of its places and
  the language in **More**, the patient portal's sections are its tabs.
- **Tables** show as a table whenever their columns fit, and as stacked records when they don't — the
  fit is measured, so no page scrolls sideways from 320px to 1920px.
- **Phones** get horizontal scroll rows for figure cards, the Doctors-now hours, the portal tiles and
  the reassurance cards; every control stays at least 44px.
- **Desktop** steps the whole scale down slightly (15px base) for a denser desk screen.
- **Doctor Availability** on the dashboard shows each doctor's day hour by hour (free · some free · full ·
  break · over); tapping an hour opens Schedule Appointment on that doctor and that hour's first free time.

## How the front office works

- **One search, one box per screen.** The box in the app bar finds a patient by name, mobile, UHID,
  ABHA (address or number) or bill number (`/` focuses it). Results show each patient's ABHA and
  status icons. It steps aside while a task panel is open and on Guest Pass, MLC and Enquiry, which
  have their own patient field. A patient who isn't found can be added with **Create Patient**,
  with what was typed already filled in.
- **Registration takes only real values.** A name in letters (the box takes no digits or symbols); age 0–130, with 100 and over shown
  in red and confirmed again; sex; an Indian mobile (10 digits starting 6–9); an optional ABHA,
  checked for format and not already linked to someone else.
- **The profile is the hub.** `/patients/:uhid` shows who the patient is, their ABHA, what they owe,
  where they are and what has happened at the desk. Everything done for a patient starts there:
  Schedule Appointment · Admit or Discharge · Bills, and Reschedule or Cancel on a booking.
- **Icons beside every name:** ICU (red heart), Emergency (red siren), inpatient (blue bed),
  outpatient today (teal stethoscope), teleconsult today (purple video).
- **Tasks are flows, not pages.** Each task opens over the current page as a panel held in the URL
  (`?flow=schedule|reschedule|admit|discharge|billing`, plus `uhid`, `doctor`, `appointment`,
  `bill` and the like). Browser Back or Esc closes it, and a link with `?flow=` opens straight into
  it. Each flow ends with a short acknowledgement and closes itself. Old addresses
  (`/outpatients`, `/admissions`, `/appointments`, `/op-queue`, `/admissions/discharge`, `/payments/pending`, …)
  redirect to the matching place or flow; `?flow=consult` (the old Start Consultation) opens Schedule Appointment.
- **Schedule Appointment, one step at a time:** department → that department's doctors →
  a time to book (in person or teleconsult, where the doctor offers both) → confirm and send the
  bill to the billing counter → "Appointment Booked", confirmed once the payment is received. Nothing is chosen for the desk, and there are no walk-in tokens — every
  visit is a booking.
- **Patients is one place with three tabs** — All patients (`/patients`), Outpatients
  (`/patients/outpatients`) and Inpatients (`/patients/inpatients`) — and each patient's profile.
- **Outpatients** is one view for bookings and the queue: payment pending → to check in → waiting for consultation → with the
  doctor → done, plus bookings ahead. Each figure is also its filter; Teleconsult narrows them all.
- **Reschedule, cancel, no-show.** A cancellation asks who can't make it. If the doctor is
  unavailable the billing counter refunds the patient in full; if the patient cancels or doesn't come (no-show,
  10 minutes after the booked time) the fee is kept. A move keeps the booking and its history and
  never refunds; a patient who moves to a dearer doctor is billed the difference, while a doctor's move
  absorbs it. Doctor leave on a booked day first moves or cancels that day's bookings.
- **Care Entry never takes money.** Billing is its own department. Registering a patient is free;
  Care Entry raises the bill — a modest consultation fee on Schedule Appointment, a fee difference on a
  reschedule, the first day on a self-pay admission, an estimate — and sends the
  patient to the **billing counter**. Each bill then shows the counter's status: **Payment
  received** (green), **Payment pending** (yellow) or **Payment failed** (red). A booking is
  confirmed, and can be checked in, once its payment is received; a discharge waits for the final
  bill to be paid (insured, TPA and corporate stays by their payer). Billing and each bill are to
  view only. *Demo:* with no billing system behind it, the counter's update is simulated — a bill
  sent to the counter is marked received about 20 seconds later (`domain/billingCounter.ts`).
- **Create ABHA.** With no ABHA entered, registration offers ABDM's registration page; pointing at it
  explains to the patient what ABHA does for them.
- **Guest Pass** — nobody moves about the hospital without a hospital ID or a pass. A pass is for a
  patient's visitor (admitted patients only), a visiting doctor, or staff and service people
  without an ID; the desk records the ID seen and confirms the visit with the patient or
  attendant, the host doctor, or whoever authorised it, before **Print pass**.
- **The dashboard** has five figures, each opening its place — outpatients today, waiting for
  consultation, inpatients, payment pending, registered today — then the doctors now (Schedule
  Appointment beside each), then today's
  outpatients and what needs attention.
- **Places in the sidebar:** Dashboard · Patients · Billing · Doctors · Services (Guest Pass,
  Enquiry & Estimate, MLC). The SHRI Health mark leads to
  https://shri-ai.org. The name card at the top right switches between the desk's staff.

There is no backend. The store is in memory and starts from sample data
(`front-office/src/domain/seedData.ts`, `admissionSeedData.ts`):
- 8 doctors across 6 departments (including Dr. Raj Srinivas, Neurosurgery, and Dr. Logesh,
  Emergency Medicine), all bookable.
- 31 patients across every desk function: the queue, bookings, teleconsults, cancellations (by the
  patient and by the doctor), moved bookings (one with a fee difference), inpatients, beds awaited,
  discharges, every bill status, guest passes, MLC, estimates and a possible duplicate.
- The data is generated relative to the time the app opens, so it reads like a shift in progress at
  any hour.
- A reload starts it fresh.
