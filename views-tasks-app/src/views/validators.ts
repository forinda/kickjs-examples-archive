/// <reference lib="dom" />
/**
 * The app's own browser validators, used in templates beside the built-ins:
 * `validate="required | sameAs:'password'"`. Each returns the message when the
 * value fails. Browser only: the route's schema still decides on the server.
 */

/** The value matches another field of the same form, by name. */
export const sameAs = (value: string, other: string, form: HTMLFormElement) =>
  value === (form.elements.namedItem(other) as HTMLInputElement | null)?.value
    ? undefined
    : 'The passwords don’t match'
