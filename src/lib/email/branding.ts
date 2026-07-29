const ACCENT = '#FF6600'

export type EmailSignature = {
  name: string
  tagline: string
  linkUrl: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Convert plain text into simple HTML paragraphs. */
export function textToEmailHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = escapeHtml(block.trim()).replace(/\n/g, '<br/>')
      return `<p style="margin:0 0 16px;line-height:1.6;">${lines}</p>`
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
