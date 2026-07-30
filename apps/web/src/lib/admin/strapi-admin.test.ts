import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv, STRAPI_INTERNAL_URL: 'http://cms:1337' };
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = originalEnv;
});

describe('getStrapiAdminToken', () => {
  it('falls back to STRAPI_API_TOKEN when STRAPI_ADMIN_TOKEN is empty', async () => {
    process.env.STRAPI_ADMIN_TOKEN = '';
    process.env.STRAPI_API_TOKEN = 'api-token';

    const { getStrapiAdminToken } = await import('./strapi-admin');

    expect(getStrapiAdminToken()).toBe('api-token');
  });

  it('rejects admin writes when neither token is configured', async () => {
    delete process.env.STRAPI_ADMIN_TOKEN;
    delete process.env.STRAPI_API_TOKEN;

    const { updateAdminCategory } = await import('./strapi-admin');

    await expect(
      updateAdminCategory('category-document-id', { name: 'Updated category' })
    ).rejects.toThrow('STRAPI_ADMIN_TOKEN or STRAPI_API_TOKEN is not set');
    expect(fetch).not.toHaveBeenCalled();
  });
});
