export default ({ env }: { env: (key: string, defaultValue?: unknown) => string }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'CHANGE_ME'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'CHANGE_ME'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'CHANGE_ME'),
    },
  },
  flags: {
    // Disable the in-admin NPS prompt in production. The remaining
    // feature flags follow the Strapi 5 defaults; CI does not run
    // the admin bootstrap when NODE_ENV=test.
    nps: env('NODE_ENV') === 'production' ? false : true,
    promoteEE: false,
  },
});
