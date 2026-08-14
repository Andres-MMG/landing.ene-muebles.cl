#!/usr/bin/env node
/*
 * Seed script for the Ene Muebles catalog (institutional B2B line).
 *
 * Usage:
 *   STRAPI_URL=http://localhost:1337 \
 *   STRAPI_API_TOKEN=<admin-token> \
 *   node apps/cms/scripts/seed.cjs
 *
 * Idempotent: every product/category is created only if no entry with
 * the same slug already exists. The site-setting singleton is updated
 * in place (Strapi PUT /api/site-setting).
 *
 * Requires an API token with `find`, `create`, `update` permissions on
 * product, category, and site-setting. Regenerate from the Strapi admin
 * panel: Settings -> API Tokens -> Create new API Token (Custom).
 *
 * IMPORTANT: this seed matches the live institutional positioning of the
 * site (Escritorio + Escolar). Running it will OVERWRITE the site-setting
 * singleton with the values declared below. If the Strapi instance
 * already has categories and products from replace-catalog.cjs, this
 * seed creates parallel entries that won't conflict (different slugs)
 * but the site-setting tagline and aboutText will be replaced.
 */

'use strict';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

if (!API_TOKEN) {
  console.error(
    '[seed] Missing STRAPI_API_TOKEN. Set it in the environment before running this script.'
  );
  process.exit(1);
}

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_TOKEN}`,
};

const CATEGORIES = [
  {
    name: 'Oficina',
    slug: 'oficina',
    description:
      'Mobiliario y equipamiento para oficinas y salas de administración.',
    order: 0,
    active: true,
  },
  {
    name: 'Escolar',
    slug: 'escolar',
    description:
      'Mobiliario escolar normado para salas de clases y educación.',
    order: 1,
    active: true,
  },
];

const SITE_SETTING = {
  siteName: 'ENE-MUEBLES',
  tagline:
    'Mobiliario escolar y de oficina para instituciones en Chile. Despacho de la V a la X región y cotización en 24 h.',
  contactEmail: 'contacto@ene-muebles.cl',
  contactPhone: '+569 9539 5339',
  whatsappNumber: '+56978901234',
  address: 'Cautin 1782',
  businessHours: 'Lun a Vie 09:00 - 18:00',
  aboutText:
    'ENE-MUEBLES fabrica y distribuye mobiliario escolar y de oficina bajo estándares de pliego público. Cada pieza se entrega con ficha técnica, declaración de materiales y plazo de despacho por escrito. Suministramos mobiliario a instituciones educativas, empresas y organismos públicos de la región de Valparaíso a Los Lagos. Trabajamos con los principales fabricantes y ofrecemos garantía y despacho por escrito.',
  socialLinks: {
    instagram: 'enemuebles',
    facebook: 'enemuebles.cl',
  },
};

async function strapiFetch(path, options = {}) {
  const url = `${STRAPI_URL.replace(/\/+$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...AUTH_HEADERS, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `[seed] Strapi ${options.method || 'GET'} ${path} failed: ${res.status} ${res.statusText} ${body}`
    );
  }
  return res.json();
}

async function findBySlug(plural, slug) {
  const qs = `?filters[slug][$eq]=${encodeURIComponent(slug)}`;
  const json = await strapiFetch(`/api/${plural}${qs}`);
  return json?.data?.[0] ?? null;
}

async function ensureCategory(category) {
  try {
    const existing = await findBySlug('categories', category.slug);
    if (existing) {
      console.log(`[seed] category '${category.slug}' already exists, skipping.`);
      return existing;
    }
    const json = await strapiFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ data: category }),
    });
    console.log(`[seed] category '${category.slug}' created (id=${json?.data?.id}).`);
    return json.data;
  } catch (err) {
    console.error(`[seed] category '${category.slug}' failed:`, err.message);
    throw err;
  }
}

async function updateSiteSetting() {
  try {
    const json = await strapiFetch('/api/site-setting', {
      method: 'PUT',
      body: JSON.stringify({ data: SITE_SETTING }),
    });
    console.log(`[seed] site-setting updated (id=${json?.data?.id}).`);
    return json.data;
  } catch (err) {
    console.error('[seed] site-setting update failed:', err.message);
    throw err;
  }
}

async function main() {
  console.log(`[seed] Using Strapi at ${STRAPI_URL}.`);
  console.log('[seed] Note: products are seeded by apps/cms/scripts/_scrape/replace-catalog.cjs, not by this script.');

  for (const category of CATEGORIES) {
    await ensureCategory(category);
  }

  await updateSiteSetting();

  console.log('[seed] Done.');
}

main().catch((err) => {
  console.error('[seed] Aborted:', err);
  process.exit(1);
});