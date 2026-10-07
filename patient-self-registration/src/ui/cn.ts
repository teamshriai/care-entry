/** Joins class names, skipping falsy values. (It concatenates; it does not
 *  merge conflicting utilities — compose with that in mind.) */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
