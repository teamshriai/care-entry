import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// ─── Care Entry = Front Office + Patient Self-Registration, ONE app ──────────
// The patient self-registration portal keeps its own source in the sibling
// `patient-self-registration/` workspace and is NOT copied here. It is served
// by THIS Vite server (and included in THIS build) under
//
//     /patient-self-registration
//
// How: `patient-self-registration/index.html` and `demo.html` in this folder are
// two extra HTML entry pages whose script points at the portal's own source
// (../../patient-self-registration/src). Vite therefore serves them from the
// same dev server — one process, one port, working hot reload — and bundles
// them into the same `dist/`. No proxy, no second server.
const PORTAL_ROUTE = '/patient-self-registration'

// `/patient-self-registration` (with or without a trailing slash) opens the
// portal's entry page instead of falling through to Front Office's router.
function portalRoute(): Plugin {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const [path, query] = (req.url ?? '').split('?')
    if (path === PORTAL_ROUTE || path === `${PORTAL_ROUTE}/`) {
      req.url = `${PORTAL_ROUTE}/index.html${query ? `?${query}` : ''}`
    }
    next()
  }
  return {
    name: 'care-entry-patient-self-registration-route',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  }
}

// ─── Build stamp ─────────────────────────────────────────────────────────────
// Shown at the foot of the sidebar so anyone can tell which build they are
// looking at: "OCT 3 - 12:05 @26" (India time, when this build was made),
// with the commit it was built from in its tooltip.
function buildStamp(at: Date): string {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', ...options }).format(at)
  const time = part({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return `${part({ month: 'short' }).toUpperCase()} ${part({ day: 'numeric' })} - ${time} @${part({ year: '2-digit' })}`
}

function buildCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Deployment sub-path, e.g. BASE_PATH=/dev/care-entry/ (defaults to the site root)
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), portalRoute()],
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp(new Date())),
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  },
  // Listen on all network interfaces so colleagues on the same LAN can open the app
  server: { host: true },
  preview: { host: true },
  build: {
    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        patientSelfRegistration: resolve(__dirname, 'patient-self-registration/index.html'),
        patientSelfRegistrationDemo: resolve(__dirname, 'patient-self-registration/demo.html'),
      },
    },
  },
})
