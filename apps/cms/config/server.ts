// Object-style export (matches Strapi v5 loader behavior in CJS-compiled builds).
const envStr = (key: string, fallback?: string): string => {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : (fallback ?? '');
};

const envInt = (key: string, fallback = 0): number => {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const envBool = (key: string, fallback = false): boolean => {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true' || value === '1';
};

const envArray = (key: string, fallback: string[] = []): string[] => {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
};

export default {
  host: envStr('HOST', '0.0.0.0'),
  port: envInt('PORT', 1337),
  url: envStr('PUBLIC_URL', ''),
  app: {
    keys: envArray('APP_KEYS'),
  },
  webhooks: {
    populateRelations: envBool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
};
