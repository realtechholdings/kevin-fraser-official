/** Drop a colour code that was saved on the end of a class description. */
export function publicTierDescription(value: string | null | undefined) {
  return String(value || '')
    .replace(/(?:\s*#[0-9A-Fa-f]{6}\b)+\s*$/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
