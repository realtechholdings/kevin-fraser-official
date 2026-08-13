import type { Area } from 'react-easy-crop'

export type ImageCropPreset = {
  id: string
  label: string
  /** Width / height */
  aspect: number
  /** Target export width in px */
  outputWidth: number
  hint: string
}

export const IMAGE_CROP_PRESETS = {
  studioThumb: {
    id: 'studioThumb',
    label: '9:14 portrait',
    aspect: 9 / 14,
    outputWidth: 900,
    hint: 'Studio / Showreel card thumbnail',
  },
  bonusThumb: {
    id: 'bonusThumb',
    label: '9:14 portrait',
    aspect: 9 / 14,
    outputWidth: 900,
    hint: 'Bonus content card thumbnail',
  },
  kevin11Thumb: {
    id: 'kevin11Thumb',
    label: '9:14 portrait',
    aspect: 9 / 14,
    outputWidth: 900,
    hint: 'Kevin11 card thumbnail',
  },
  showreelHero: {
    id: 'showreelHero',
    label: '2.4:1 banner',
    aspect: 2.4,
    outputWidth: 2400,
    hint: 'Showreel page hero',
  },
  showreelTab: {
    id: 'showreelTab',
    label: '3:1 banner',
    aspect: 3,
    outputWidth: 2400,
    hint: 'Showreel tab banner',
  },
  tourBanner: {
    id: 'tourBanner',
    label: '2.8:1 banner',
    aspect: 2.8,
    outputWidth: 2800,
    hint: 'Tour stage banner',
  },
  tourCover: {
    id: 'tourCover',
    label: '16:9 card',
    aspect: 16 / 9,
    outputWidth: 1600,
    hint: 'Tour card image',
  },
  showArtwork: {
    id: 'showArtwork',
    label: '2.4:1 hero',
    aspect: 2.4,
    outputWidth: 2400,
    hint: 'Event page banner',
  },
  showList: {
    id: 'showList',
    label: '1:1 square',
    aspect: 1,
    outputWidth: 600,
    hint: 'Stage list thumbnail',
  },
  venue: {
    id: 'venue',
    label: '16:9 photo',
    aspect: 16 / 9,
    outputWidth: 1600,
    hint: 'Venue photo',
  },
  avatar: {
    id: 'avatar',
    label: '1:1 square',
    aspect: 1,
    outputWidth: 512,
    hint: 'AI avatar',
  },
  emailSignature: {
    id: 'emailSignature',
    label: '3:1 signature',
    aspect: 3,
    outputWidth: 900,
    hint: 'Email signature image',
  },
  ticketArt: {
    id: 'ticketArt',
    label: '3:4 ticket art',
    aspect: 3 / 4,
    outputWidth: 480,
    hint: 'Ticket PDF side artwork',
  },
} as const satisfies Record<string, ImageCropPreset>

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (err) => reject(err))
    image.crossOrigin = 'anonymous'
    image.src = src
  })
}

/** Crop `imageSrc` to `pixelCrop` and scale to `outputWidth`, returning a JPEG File. */
export async function getCroppedImageFile(input: {
  imageSrc: string
  pixelCrop: Area
  outputWidth: number
  fileName?: string
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
  quality?: number
}): Promise<File> {
  const image = await loadImage(input.imageSrc)
  const mimeType = input.mimeType || 'image/jpeg'
  const quality = input.quality ?? 0.92

  const scale = input.outputWidth / Math.max(1, input.pixelCrop.width)
  const outputWidth = Math.round(input.outputWidth)
  const outputHeight = Math.max(1, Math.round(input.pixelCrop.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas context.')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    input.pixelCrop.x,
    input.pixelCrop.y,
    input.pixelCrop.width,
    input.pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error('Failed to encode cropped image.'))
        else resolve(result)
      },
      mimeType,
      quality,
    )
  })

  const base =
    (input.fileName || 'image')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'image'
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  return new File([blob], `${base}-cropped.${ext}`, { type: mimeType })
}
