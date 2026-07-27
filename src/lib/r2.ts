import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim(),
  )
}

function getR2Client() {
  const accountId = requiredEnv('R2_ACCOUNT_ID')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: true,
  })
}

export function getR2Bucket() {
  return requiredEnv('R2_BUCKET_NAME')
}

export function publicUrlForKey(key: string) {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, '')
  if (!base) return ''
  return `${base}/${key.replace(/^\//, '')}`
}

export function bonusFilePath(id: string, kind: 'media' | 'thumbnail' = 'media') {
  return kind === 'thumbnail' ? `/api/bonus/${id}/thumbnail` : `/api/bonus/${id}/file`
}

export function studioFilePath(id: string, kind: 'media' | 'thumbnail' = 'media') {
  return kind === 'thumbnail' ? `/api/studio/${id}/thumbnail` : `/api/studio/${id}/file`
}

export function r2ObjectKey(folder: string, filename: string) {
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${folder}/${stamp}-${rand}-${safe || 'media'}`
}

export function bonusMediaKey(filename: string) {
  return r2ObjectKey('bonus', filename)
}

export function studioMediaKey(filename: string) {
  return r2ObjectKey('studio', filename)
}

export function settingsMediaKey(filename: string) {
  return r2ObjectKey('settings', filename)
}

export async function createR2UploadUrl(input: {
  key: string
  contentType: string
  expiresIn?: number
}) {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: input.key,
    ContentType: input.contentType,
  })
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: input.expiresIn ?? 60 * 10,
  })
  return {
    key: input.key,
    uploadUrl,
    publicUrl: publicUrlForKey(input.key),
  }
}

/** @deprecated Prefer createR2UploadUrl */
export async function createBonusUploadUrl(input: {
  key: string
  contentType: string
  expiresIn?: number
}) {
  return createR2UploadUrl(input)
}

export async function createR2DownloadUrl(key: string, expiresIn = 60 * 60) {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: getR2Bucket(),
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn })
}

/** @deprecated Prefer createR2DownloadUrl */
export async function createBonusDownloadUrl(key: string, expiresIn = 60 * 60) {
  return createR2DownloadUrl(key, expiresIn)
}

export async function deleteR2Object(key: string) {
  if (!key) return
  const client = getR2Client()
  await client.send(
    new DeleteObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
    }),
  )
}
