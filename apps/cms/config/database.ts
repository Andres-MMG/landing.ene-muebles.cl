// Inline env helper (Strapi's `env` is provided through the function-style
// default export, but Strapi v5 in some build paths expects a plain object).
// Using `process.env` here keeps the file shape stable across loaders.
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
  connection: {
    client: 'mysql',
    connection: {
      host: envStr('DATABASE_HOST', 'db'),
      port: envInt('DATABASE_PORT', 3306),
      database: envStr('DATABASE_NAME', 'strapi'),
      user: envStr('DATABASE_USERNAME', 'strapi'),
      password: envStr('DATABASE_PASSWORD', ''),
      ssl: envBool('DATABASE_SSL', false),
    },
    pool: {
      min: envInt('DATABASE_POOL_MIN', 0),
      max: envInt('DATABASE_POOL_MAX', 10),
    },
  },
  settings: {
    forceMigration: envBool('DATABASE_FORCE_MIGRATION', false),
  },
};
