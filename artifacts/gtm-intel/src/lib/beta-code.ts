const STORAGE_KEY = "gtm_beta_code_v1";

export function getBetaCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setBetaCode(code: string): void {
  localStorage.setItem(STORAGE_KEY, code);
}

export function clearBetaCode(): void {
  localStorage.removeItem(STORAGE_KEY);
}
