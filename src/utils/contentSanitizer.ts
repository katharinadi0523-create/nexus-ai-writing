const COMPLETE_SUP_TAG_PATTERN = /<sup\b[^>]*>[\s\S]*?<\/sup>/gi;
const TRAILING_SUP_TAG_PATTERN = /<sup\b[\s\S]*$/gi;
const ORPHAN_SUP_CLOSING_TAG_PATTERN = /<\/sup>/gi;

export function stripSourceSupTags(content: string): string {
  if (!content) {
    return '';
  }

  return content
    .replace(COMPLETE_SUP_TAG_PATTERN, '')
    .replace(TRAILING_SUP_TAG_PATTERN, '')
    .replace(ORPHAN_SUP_CLOSING_TAG_PATTERN, '');
}
