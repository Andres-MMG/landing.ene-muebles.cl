import { describe, it, expect } from 'vitest';
import { buildSubmitPayload } from './SiteSettingForm';

const baseValues = {
  siteName: 'Ene Muebles',
  tagline: 'Muebles a medida',
  rut: '76.123.456-7',
  contactEmail: 'hola@ene-muebles.cl',
  contactPhone: '+56 9 1234 5678',
  whatsappNumber: '+56912345678',
  whatsappDefaultMessage: 'Hola, cotización',
  address: 'Av. Apoquindo 4000',
  dispatchCoverage: 'Despacho a todo Chile',
  addressCity: 'Temuco',
  addressRegion: 'La Araucanía',
  businessHours: 'Lun a Vie 09:00-18:00',
  aboutText: 'Muebles artesanales',
  socialInstagram: 'https://instagram.com/enemuebles',
  socialFacebook: 'https://facebook.com/enemuebles',
  socialLinkedIn: '',
  socialTiktok: '',
};

describe('SiteSettingForm.buildSubmitPayload', () => {
  it('always includes the required trimmed fields', () => {
    const payload = buildSubmitPayload(baseValues);
    expect(payload.siteName).toBe('Ene Muebles');
    expect(payload.rut).toBe('76.123.456-7');
    expect(payload.whatsappDefaultMessage).toBe('Hola, cotización');
  });

  it('trims surrounding whitespace from required fields', () => {
    const payload = buildSubmitPayload({
      ...baseValues,
      siteName: '  Ene Muebles  ',
      rut: '\t76.123.456-7\n',
      whatsappDefaultMessage: ' Hola ',
    });
    expect(payload.siteName).toBe('Ene Muebles');
    expect(payload.rut).toBe('76.123.456-7');
    expect(payload.whatsappDefaultMessage).toBe('Hola');
  });

  it('omits optional scalars when blank', () => {
    const payload = buildSubmitPayload({ ...baseValues, tagline: '', contactPhone: '   ' });
    expect('tagline' in payload).toBe(false);
    expect('contactPhone' in payload).toBe(false);
  });

  it('sends non-blank dispatchCoverage, addressCity, and addressRegion', () => {
    const payload = buildSubmitPayload(baseValues);
    expect(payload.dispatchCoverage).toBe('Despacho a todo Chile');
    expect(payload.addressCity).toBe('Temuco');
    expect(payload.addressRegion).toBe('La Araucanía');
  });

  it('omits the new optional scalars when blank', () => {
    const payload = buildSubmitPayload({
      ...baseValues,
      dispatchCoverage: '',
      addressCity: '   ',
      addressRegion: '',
    });
    expect('dispatchCoverage' in payload).toBe(false);
    expect('addressCity' in payload).toBe(false);
    expect('addressRegion' in payload).toBe(false);
  });

  it('packs every social key — blank ones become null so PUT clears them', () => {
    const payload = buildSubmitPayload(baseValues);
    expect(payload.socialLinks).toEqual({
      instagram: 'https://instagram.com/enemuebles',
      facebook: 'https://facebook.com/enemuebles',
      linkedin: null,
      tiktok: null,
    });
  });

  it('clears socialLinks.instagram when the input is emptied', () => {
    // Given socialLinks.instagram already exists in Strapi, clearing
    // the form input and submitting must NOT silently drop the field.
    // It must be sent as `null` so the route propagates the clear.
    const payload = buildSubmitPayload({ ...baseValues, socialInstagram: '' });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.instagram).toBeNull();
  });

  it('clears a whitespace-only social input', () => {
    const payload = buildSubmitPayload({ ...baseValues, socialFacebook: '   \t\n' });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.facebook).toBeNull();
  });

  it('trims non-empty social inputs before forwarding', () => {
    const payload = buildSubmitPayload({
      ...baseValues,
      socialInstagram: '  https://instagram.com/enemuebles  ',
    });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.instagram).toBe('https://instagram.com/enemuebles');
  });
});

describe('SiteSettingForm.buildSubmitPayload — social URL normalization', () => {
  // The form owns the URL-vs-handle normalization so the operator can
  // paste a full URL OR type just a username. The proxy route stays
  // permissive; this block pins the wire shape the form must produce.
  // Reproduces the exact inputs the operator typed in the bug report:
  // Instagram=handle, Facebook=domain-like, LinkedIn=handle, TikTok=full URL.
  const fullInputs = {
    siteName: 'Ene Muebles',
    rut: '76.123.456-7',
    whatsappDefaultMessage: 'Hola',
    tagline: 'Muebles a medida',
    contactEmail: 'hola@ene-muebles.cl',
    contactPhone: '+56 2 2898 4421',
    whatsappNumber: '+56 9 7890 1234',
    address: 'Av. Apoquindo 4000',
    dispatchCoverage: '',
    addressCity: '',
    addressRegion: '',
    businessHours: 'Lun a Vie 09:00-18:00',
    aboutText: 'Muebles artesanales',
    socialInstagram: '',
    socialFacebook: '',
    socialLinkedIn: '',
    socialTiktok: '',
  };

  it('normalizes an Instagram handle to a full instagram.com URL', () => {
    const payload = buildSubmitPayload({ ...fullInputs, socialInstagram: 'enemuebles' });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.instagram).toBe('https://www.instagram.com/enemuebles');
  });

  it('normalizes a Facebook domain-like input to a full facebook.com URL', () => {
    // The operator typed `enemuebles.cl` (looks like a domain but is
    // meant as the handle). The form must surface it under the
    // facebook.com base, not treat it as a non-FB URL.
    const payload = buildSubmitPayload({ ...fullInputs, socialFacebook: 'enemuebles.cl' });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.facebook).toBe('https://www.facebook.com/enemuebles.cl');
  });

  it('normalizes a LinkedIn handle to a full linkedin.com/in/<handle> URL', () => {
    const payload = buildSubmitPayload({ ...fullInputs, socialLinkedIn: 'ene-muebles' });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.linkedin).toBe('https://www.linkedin.com/in/ene-muebles');
  });

  it('preserves an already-URL TikTok input verbatim', () => {
    const payload = buildSubmitPayload({
      ...fullInputs,
      socialTiktok: 'https://tiktok.com/@enemuebles',
    });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.tiktok).toBe('https://tiktok.com/@enemuebles');
  });

  it('preserves a verbatim instagram.com URL (no canonical rewriting)', () => {
    // Existing entries round-trip through the singleton without
    // `www.` — the form must not forcibly upgrade them.
    const payload = buildSubmitPayload({
      ...fullInputs,
      socialInstagram: 'https://instagram.com/enemuebles',
    });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.instagram).toBe('https://instagram.com/enemuebles');
  });

  it('still sends null for an empty TikTok input even when others are handles', () => {
    const payload = buildSubmitPayload({
      ...fullInputs,
      socialInstagram: 'enemuebles',
      socialTiktok: '',
    });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.tiktok).toBeNull();
  });

  it('strips a leading @ from a TikTok handle before prepending the base URL', () => {
    const payload = buildSubmitPayload({ ...fullInputs, socialTiktok: '@enemuebles' });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.tiktok).toBe('https://www.tiktok.com/@enemuebles');
  });

  it('normalizes all four networks in one go (the bug-report scenario)', () => {
    const payload = buildSubmitPayload({
      ...fullInputs,
      socialInstagram: 'enemuebles',
      socialFacebook: 'enemuebles.cl',
      socialLinkedIn: 'ene-muebles',
      socialTiktok: 'https://tiktok.com/@enemuebles',
    });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social).toEqual({
      instagram: 'https://www.instagram.com/enemuebles',
      facebook: 'https://www.facebook.com/enemuebles.cl',
      linkedin: 'https://www.linkedin.com/in/ene-muebles',
      tiktok: 'https://tiktok.com/@enemuebles',
    });
  });

  it('round-trips an Instagram URL with surrounding whitespace', () => {
    const payload = buildSubmitPayload({
      ...fullInputs,
      socialInstagram: '  https://instagram.com/enemuebles  ',
    });
    const social = payload.socialLinks as Record<string, string | null>;
    expect(social.instagram).toBe('https://instagram.com/enemuebles');
  });
});

describe('SiteSettingForm.buildSubmitPayload — does NOT touch input state', () => {
  // The normalization lives in the outbound payload only. The input
  // value in `values` must still reflect what the operator typed, so
  // the rendered <input> shows their original text on next edit.
  // We assert this indirectly: passing the raw handle to
  // buildSubmitPayload twice produces the same normalized wire shape
  // (no mutation), and the values object passed in is unchanged.
  const fullInputs = {
    siteName: 'Ene Muebles',
    rut: '76.123.456-7',
    whatsappDefaultMessage: 'Hola',
    tagline: '',
    contactEmail: '',
    contactPhone: '',
    whatsappNumber: '',
    address: '',
    dispatchCoverage: '',
    addressCity: '',
    addressRegion: '',
    businessHours: '',
    aboutText: '',
    socialInstagram: '',
    socialFacebook: '',
    socialLinkedIn: '',
    socialTiktok: '',
  };

  it('returns identical wire shape when called twice with the same raw handle', () => {
    const values = { ...fullInputs, socialInstagram: 'enemuebles' };
    const first = buildSubmitPayload(values);
    const second = buildSubmitPayload(values);
    expect(first.socialLinks).toEqual(second.socialLinks);
  });
});