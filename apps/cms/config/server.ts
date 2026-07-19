export default ({ env }: { env: (key: string, defaultValue?: unknown) => string }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', ''),
  app: {
    keys: env.array('APP_KEYS', ['CHANGE_ME', 'CHANGE_ME', 'CHANGE_ME', 'CHANGE_ME']),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
