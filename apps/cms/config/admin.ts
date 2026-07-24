const envStr = (key: string, fallback?: string): string => {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : (fallback ?? '');
};

const envBool = (key: string, fallback = false): boolean => {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true' || value === '1';
};

export default {
  auth: {
    secret: envStr('ADMIN_JWT_SECRET', 'CHANGE_ME'),
  },
  apiToken: {
    salt: envStr('API_TOKEN_SALT', 'CHANGE_ME'),
  },
  transfer: {
    token: {
      salt: envStr('TRANSFER_TOKEN_SALT', 'CHANGE_ME'),
    },
  },
  flags: {
    // Disable the in-admin NPS prompt in production. The remaining
    // feature flags follow the Strapi 5 defaults; CI does not run
    // the admin bootstrap when NODE_ENV=test.
    nps: envBool('NODE_ENV_IS_PRODUCTION', false),
    promoteEE: false,
  },
};
