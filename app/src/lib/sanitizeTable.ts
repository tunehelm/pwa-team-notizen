/**
 * Allowlist-based sanitizer for pasted HTML table content only.
 * No scripts, no event handlers, no dangerous style injection.
 */

const ALLOWED_TAGS = new Set([
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
  'p', 'br', 'span', 'b', 'strong', 'i', 'em', 'u', 'a',
])
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  col: new Set(['span']),
  th: new Set([]),
  td: new Set([]),
  table: new Set([]),
}
const SAFE_STYLE_KEYS = new Set(['width', 'min-width', 'max-width', 'border', 'border-collapse', 'padding', 'text-align', 'vertical-align'])

function parseStyle(style: string): string {
  const out: string[] = []
  for (const part of style.split(';')) {
    const [key, ...v] = part.split(':').map((s) => s.trim())
    const value = v.join(':').trim()
    if (!key || !value) continue
    const lower = key.toLowerCase()
    if (SAFE_STYLE_KEYS.has(lower)) out.push(`${key}: ${value}`)
  }
  return out.join('; ')
}

function sanitizeAttr(el: Element, tag: string): Record<string, string> {
  const allowed = ALLOWED_ATTRS[tag]
  const attrs: Record<string, string> = {}
  if (tag === 'a' && allowed) {
    const href = el.getAttribute('href')
    if (href && /^https?:\/\//i.test(href)) {
      attrs.href = href
      attrs.target = '_blank'
      attrs.rel = 'noopener'
    }
  }
  if (tag === 'col') {
    const span = el.getAttribute('span')
    if (span && /^\d+$/.test(span)) attrs.span = span
  }
  const style = el.getAttribute('style')
  if (style && (tag === 'table' || tag === 'th' || tag === 'td' || tag === 'col')) {
    const safe = parseStyle(style)
    if (safe) attrs.style = safe
  }
  return attrs
}

function serializeAttrs(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ')
}

/**
 * Sanitizes HTML that is expected to be table markup only.
 * - Only allowlisted tags are kept; others are stripped (contents kept).
 * - No script, no event attributes, no dangerous style.
 * - Safe style keys: width, min-width, max-width, border, border-collapse, padding, text-align, vertical-align.
 */
export function sanitizeHtmlTable(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? ''
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'br') return '<br>'
    if (!ALLOWED_TAGS.has(tag)) {
      return Array.from(node.childNodes).map(walk).join('')
    }
    const attrs = sanitizeAttr(el, tag)
    const attrStr = Object.keys(attrs).length ? ' ' + serializeAttrs(attrs) : ''
    const inner = Array.from(node.childNodes).map(walk).join('')
    return `<${tag}${attrStr}>${inner}</${tag}>`
  }
  const body = doc.body
  let out = Array.from(body.childNodes).map(walk).join('')
  out = out.replace(/<p>\s*<\/p>/g, '')
  return out.trim()
}
