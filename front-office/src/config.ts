// Patient Self-Registration is part of the same Care Entry application. It is
// served by this app's own server/build at /patient-self-registration (see
// vite.config.ts), so there is nothing to configure: the link is the same
// address Front Office is running on, in development and in production.

const PORTAL_PATH = '/patient-self-registration'

/** Absolute URL of the Patient Self-Registration portal. Used by both "Open Portal" and "Copy Link". */
export const PATIENT_SELF_REGISTRATION_URL: string = new URL(PORTAL_PATH, window.location.origin).toString()
