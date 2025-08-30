/**
 * Simple markdown parser for quote formatting
 * Handles: **bold**, *italic*, line breaks, and paragraphs
 */

export function parseMarkdown(text) {
  if (!text) return ''

  let html = text

  // Handle line breaks and paragraphs
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br>')

  // Wrap in paragraph tags if not already wrapped
  if (!html.startsWith('<p>')) {
    html = `<p>${html}</p>`
  }

  // Handle bold text: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Handle italic text: *text* -> <em>text</em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Handle emphasis: _text_ -> <em>text</em>
  html = html.replace(/_(.*?)_/g, '<em>$1</em>')

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '')

  return html
}

/**
 * Convert markdown to plain text (for search functionality)
 */
export function markdownToPlainText(text) {
  if (!text) return ''

  let plain = text

  // Remove markdown formatting
  plain = plain.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
  plain = plain.replace(/\*(.*?)\*/g, '$1') // Remove italic
  plain = plain.replace(/_(.*?)_/g, '$1') // Remove emphasis

  // Convert line breaks to spaces for search
  plain = plain.replace(/\n/g, ' ')

  return plain
}
