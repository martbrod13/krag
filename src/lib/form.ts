/**
 * The text a person typed into a form, to show it again after an error.
 * React empties a form after every submit, so without this a typo in one
 * field would wipe all the others.
 */
export function formValues(formData: FormData, keys: readonly string[]) {
  return Object.fromEntries(
    keys.map((key) => [key, String(formData.get(key) ?? "")]),
  );
}
