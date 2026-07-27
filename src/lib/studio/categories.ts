export const STUDIO_CATEGORIES = [
  'behind_the_scenes',
  'characters',
  'creative_process',
] as const

export type StudioCategory = (typeof STUDIO_CATEGORIES)[number]

export const STUDIO_CATEGORY_LABELS: Record<StudioCategory, string> = {
  behind_the_scenes: 'Behind the Scenes',
  characters: 'Characters',
  creative_process: 'Creative Process',
}
