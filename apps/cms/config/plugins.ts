export default {
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '7d',
      },
    },
  },
  // Media-library cache headers (ISR milestone): the public Next.js
  // frontend serves `/uploads/**` straight from this Strapi origin, and
  // the local provider previously answered with koa-static's default
  // `Cache-Control: max-age=0`, forcing browsers to re-download every
  // image on every visit. `providerOptions.localServer` is read by the
  // upload plugin and spread into the koa-static middleware serving
  // `/uploads/(.*)` (verified against @strapi/upload 5.2.0 source).
  //
  // Unit note: koa-send's `maxage` is in MILLISECONDS (it emits
  // `max-age=${maxage / 1000}`), so 30 days = 2_592_000_000 ms — not
  // the 2_592_000 value that would only yield ~43 minutes.
  upload: {
    config: {
      providerOptions: {
        localServer: {
          maxage: 2_592_000_000, // 30 days, in milliseconds
        },
      },
    },
  },
};
