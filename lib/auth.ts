export function validateAuth(authHeader: string | null): boolean {
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '').trim();
  const password = (process.env.AUTH_PASSWORD || '').trim();

  return token === password;
}
