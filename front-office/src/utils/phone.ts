// Mobile numbers are exactly 10 digits. One place defines the rule so every
// mobile field and every domain action agrees on it.

export const MOBILE_LENGTH = 10
export const MOBILE_ERROR = 'Enter a valid 10-digit mobile number.'

/** Keep digits only, and at most the first 10 of them. */
export function sanitizeMobile(value: string): string {
  return value.replace(/\D/g, '').slice(0, MOBILE_LENGTH)
}

export function isValidMobile(value: string | null | undefined): boolean {
  return /^\d{10}$/.test(value ?? '')
}

/** For editing an already-stored number such as "+91 98450 11020": drop a leading
 *  country code so the 10-digit field starts from the real number. */
export function toEditableMobile(stored: string): string {
  const digits = stored.replace(/\D/g, '')
  return (digits.length > MOBILE_LENGTH && digits.startsWith('91') ? digits.slice(-MOBILE_LENGTH) : digits).slice(
    0,
    MOBILE_LENGTH,
  )
}
