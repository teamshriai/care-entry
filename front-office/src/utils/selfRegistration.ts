/** Where the patient self-registration form lives — part of this app, under
 *  its own base path, so the link is right wherever Care Entry is deployed. */
export function selfRegistrationLink(): string {
  return new URL(`${import.meta.env.BASE_URL}patient-self-registration/`, window.location.origin).toString()
}
