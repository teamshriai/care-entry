// Entry script for the Patient Self-Registration identity demo (/patient-self-registration/demo.html).
import faviconUrl from '../../patient-self-registration/public/favicon.svg?url'
import '../../patient-self-registration/src/demo/main'

document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', faviconUrl)
