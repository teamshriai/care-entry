import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
//
// NOTE: inside Care Entry this app is not started on its own. The Front Office
// Vite server/build (front-office/vite.config.ts) serves it at
// /patient-self-registration using the entry pages in
// front-office/patient-self-registration/. This config only matters when the
// app is run standalone: `npm run dev -w patient-self-registration`.
export default defineConfig({
  plugins: [react()],
  // Bind to every interface so the app is reachable from other machines on
  // the same network, not just localhost.
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
      },
    },
  },
})
