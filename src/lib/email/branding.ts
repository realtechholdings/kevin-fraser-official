const ACCENT = '#FF6600'

export type EmailSignature = {
  name: string
  tagline: string
  linkUrl: string
  imageUrl?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const IMAGE_LINE = /^\[image:\s*(https?:\/\/\S+?)\s*\]$/i

/**
 * Convert plain text into simple HTML paragraphs.
 * A line of the form `[image: https://...]` becomes an inline image.
 */
export function textToEmailHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const parts: string[] = []
      let buffer: string[] = []
      const flush = () => {
        if (!buffer.length) return
        parts.push(
          `<p style="margin:0 0 16px;line-height:1.6;">${buffer.map(escapeHtml).join('<br/>')}</p>`,
        )
        buffer = []
      }
      for (const line of block.trim().split('\n')) {
        const match = line.trim().match(IMAGE_LINE)
        if (match) {
          flush()
          parts.push(
            `<img src="${escapeHtml(match[1])}" alt="" style="display:block;width:100%;max-width:536px;height:auto;border-radius:12px;margin:0 0 16px;" />`,
          )
        } else {
          buffer.push(line)
        }
      }
      flush()
      return parts.join('')
    })
    .join('')
}

/** Substitute {{placeholder}} tokens (case-insensitive) with provided values. */
export function substituteTemplate(value: string, vars: Record<string, string>) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const found = vars[key] ?? vars[key.toLowerCase()]
    return found !== undefined ? found : match
  })
}

export function renderEmailHtml({
  bodyHtml,
  signature,
  appUrl,
}: {
  bodyHtml: string
  signature?: EmailSignature | null
  appUrl: string
}) {
  const signatureHtml = signature
    ? `
      <tr>
        <td style="padding:24px 32px 0;border-top:1px solid #26262e;">
          ${signature.imageUrl ? `<img src="${escapeHtml(signature.imageUrl)}" alt="${escapeHtml(signature.name)}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 0 12px;" />` : ''}
          <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">${escapeHtml(signature.name)}</p>
          ${signature.tagline ? `<p style="margin:4px 0 0;font-size:12px;color:#9a9aa5;">${escapeHtml(signature.tagline)}</p>` : ''}
          ${signature.linkUrl ? `<p style="margin:8px 0 0;font-size:12px;"><a href="${escapeHtml(signature.linkUrl)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(signature.linkUrl.replace(/^https?:\/\//, ''))}</a></p>` : ''}
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0c0c10;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c10;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#16161c;border-radius:16px;overflow:hidden;border:1px solid #26262e;">
            <tr>
              <td style="background:${ACCENT};padding:20px 32px;">
                <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:0.16em;color:#0c0c10;text-transform:uppercase;">Kevin Fraser</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#e6e6ea;font-size:15px;">
                ${bodyHtml}
              </td>
            </tr>
            ${signatureHtml}
            <tr>
              <td style="padding:24px 32px 28px;">
                <p style="margin:0;font-size:11px;color:#5c5c66;">
                  Sent by Kevin Fraser Official ·
                  <a href="${escapeHtml(appUrl)}" style="color:#8a8a94;text-decoration:none;">${escapeHtml(appUrl.replace(/^https?:\/\//, ''))}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
