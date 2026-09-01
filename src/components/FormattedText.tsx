import { Fragment } from 'react'

/** Render textarea-style copy with paragraph and line breaks preserved. */
export default function FormattedText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (!paragraphs.length) return null

  return (
    <div className={className}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className={i > 0 ? 'mt-[0.9em]' : undefined}>
          {paragraph.split('\n').map((line, j) => (
            <Fragment key={j}>
              {j > 0 ? <br /> : null}
              {line}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  )
}
