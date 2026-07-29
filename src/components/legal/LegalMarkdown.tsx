'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { LegalSection } from '@/components/legal/LegalDocument'

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let match: RegExpExecArray | null
  let i = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-medium text-[var(--foreground)]">
          {token.slice(2, -2)}
        </strong>,
      )
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        const href = linkMatch[2]
        const label = linkMatch[1]
        const external = href.startsWith('http') || href.startsWith('mailto:')
        if (external) {
          nodes.push(
            <a
              key={`${keyPrefix}-a-${i}`}
              href={href}
              className="underline hover:text-[var(--foreground)]"
            >
              {label}
            </a>,
          )
        } else {
          nodes.push(
            <Link
              key={`${keyPrefix}-a-${i}`}
              href={href}
              className="underline hover:text-[var(--foreground)]"
            >
              {label}
            </Link>,
          )
        }
      }
    }
    last = match.index + token.length
    i += 1
  }

  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function isListLine(line: string) {
  return /^[-*]\s+/.test(line)
}

export default function LegalMarkdown({ body }: { body: string }) {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const sections: { title: string; blocks: ReactNode[] }[] = []
  let current = { title: '', blocks: [] as ReactNode[] }
  let listBuffer: string[] = []
  let blockIndex = 0

  function flushList() {
    if (!listBuffer.length) return
    const items = listBuffer
    current.blocks.push(
      <ul key={`ul-${blockIndex++}`} className="list-disc space-y-1 pl-5">
        {items.map((item, idx) => (
          <li key={idx}>{renderInline(item, `li-${blockIndex}-${idx}`)}</li>
        ))}
      </ul>,
    )
    listBuffer = []
  }

  function pushParagraph(text: string) {
    if (!text.trim()) return
    current.blocks.push(
      <p key={`p-${blockIndex++}`}>{renderInline(text.trim(), `p-${blockIndex}`)}</p>,
    )
  }

  function commitSection() {
    flushList()
    if (current.title || current.blocks.length) {
      sections.push(current)
    }
    current = { title: '', blocks: [] }
  }

  let paragraph: string[] = []

  function flushParagraph() {
    if (!paragraph.length) return
    pushParagraph(paragraph.join(' '))
    paragraph = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()

    if (trimmed.startsWith('## ')) {
      flushParagraph()
      commitSection()
      current = { title: trimmed.slice(3).trim(), blocks: [] }
      continue
    }

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    if (isListLine(trimmed)) {
      flushParagraph()
      listBuffer.push(trimmed.replace(/^[-*]\s+/, ''))
      continue
    }

    flushList()
    paragraph.push(trimmed)
  }

  flushParagraph()
  commitSection()

  if (!sections.length) {
    return <p>No content yet.</p>
  }

  return (
    <>
      {sections.map((section, idx) =>
        section.title ? (
          <LegalSection key={`${section.title}-${idx}`} title={section.title}>
            {section.blocks}
          </LegalSection>
        ) : (
          <div key={`intro-${idx}`} className="space-y-3">
            {section.blocks}
          </div>
        ),
      )}
    </>
  )
}
