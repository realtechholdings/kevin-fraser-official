/** Send a file without letting a Node Buffer get turned into a JSON dump. */
export function attachmentResponse(body: Uint8Array | string, contentType: string, filename: string) {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '') || 'download'
  return new Response(copy, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
