// Entry script for the Patient Self-Registration portal inside Care Entry.
// It only pulls in the portal's OWN entry module (nothing is copied), and gives
// the page the portal's favicon (Front Office's public/ favicon would otherwise apply).
import faviconUrl from '../../patient-self-registration/public/favicon.svg?url'
import '../../patient-self-registration/src/main'

document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', faviconUrl)
