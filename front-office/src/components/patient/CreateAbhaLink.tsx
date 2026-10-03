import { ExternalLink } from 'lucide-react'

/** The government's ABHA registration (ABDM), for a patient who has none. */
const ABHA_REGISTER_URL = 'https://abha.abdm.gov.in/abha/v3/register'

/** "Create ABHA" — opens ABDM's registration in a new tab, so the form
 *  here stays as it is; the new ABHA is then entered or linked. */
export function CreateAbhaLink() {
  return (
    <a
      href={ABHA_REGISTER_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Opens abha.abdm.gov.in in a new tab"
      className="focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 text-xs font-semibold text-primary-text transition-colors hover:bg-primary-100"
    >
      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      Create ABHA
    </a>
  )
}
