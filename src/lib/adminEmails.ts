export const SEED_ADMIN = "shrujan29.29@gmail.com";

export function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isSeedAdmin(email: string | null | undefined): boolean {
  return Boolean(email) && normEmail(email!) === SEED_ADMIN;
}
