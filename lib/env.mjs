export function getRequiredEnv(name, { minLength = 1 } = {}) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.length < minLength) {
    throw new Error(`${name} is not configured securely`);
  }
  return value;
}
