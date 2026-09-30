# care-entry
SHRI HEALTH Care Entry Portal — Front Office and Patient Self-Registration in **one** application.

## Run it

```bash
npm install
npm run dev
```

Open **http://localhost:5173/** (Vite uses the next free port if 5173 is busy; the exact address is printed).
That is the Care Entry dashboard. **Patient Self-Registration → Open Portal** opens the portal at
`/patient-self-registration` on the same address. There is no second server, terminal or port.

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
