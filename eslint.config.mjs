import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";

// eslint 9.17.0 does NOT export the `eslint/config` subpath (it lands
// in 9.18). The `defineConfig` and `globalIgnores` helpers are
// just sugar; the flat config can be expressed as a plain array and
// the `ignores` field on a single object.
//
// The pre-existing `apps/web/src/lib/strapi.ts` (Strapi v5 client)
// and `apps/web/src/components/CategoryFilter.tsx` files use `any`
// for Strapi response shapes that are not yet modeled. They predate
// the admin slice; replacing them with proper types is a follow-up
// refactor. The override below keeps the rule active everywhere else.

export default [
  ...nextVitals,
  ...nextTypeScript,
  prettierConfig,
  {
    ignores: [
      "**/.next/**",
      "**/.turbo/**",
      "**/build/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/out/**",
      "**/next-env.d.ts",
    ],
  },
  {
    files: [
      "src/lib/strapi.ts",
      "src/components/CategoryFilter.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
