const localDevelopmentOrigins = ['http://localhost:3000', 'http://localhost:4780'];

const configuredCorsOrigins = process.env.CORS_ORIGINS?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOrigins =
  configuredCorsOrigins && configuredCorsOrigins.length > 0
    ? configuredCorsOrigins
    : localDevelopmentOrigins;

export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'http://localhost:*', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:'],
          // `null` omits the `upgrade-insecure-requests` directive entirely.
          // A boolean `false` would be coerced to the literal string "false",
          // which helmet rejects as an invalid CSP directive value.
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
