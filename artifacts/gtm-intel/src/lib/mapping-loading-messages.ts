export const MAPPING_LOADING_MESSAGES = [
  "Mapping the enterprise structure...",
  "Identifying entities by region...",
  "Finding heads of each entity...",
  "Verifying sources...",
] as const;

export function mappingLoadingMessage(elapsedSeconds: number): string {
  const index = Math.min(
    Math.floor(elapsedSeconds / 20),
    MAPPING_LOADING_MESSAGES.length - 1,
  );
  return MAPPING_LOADING_MESSAGES[index];
}
