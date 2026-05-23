/** Strip Anthropic web-search citation markup from displayed text */
export function stripCitationTags(text: string): string {
  return text.replace(/<\/?cite[^>]*>/gi, "");
}
