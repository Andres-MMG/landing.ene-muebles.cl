import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/admin/session', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/admin/strapi-admin', () => ({ listAdminImportBatches: vi.fn() }));

const session = await import('@/lib/admin/session');
const list = await import('@/lib/admin/strapi-admin');

beforeEach(() => { vi.clearAllMocks(); });

describe('ImportacionesPage', () => {
  it('renders an empty-state call to action for the owner', async () => {
    (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ role: 'owner' });
    (list.listAdminImportBatches as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { default: Page } = await import('./page');
    const html = renderToStaticMarkup(await Page());
    expect(html).toContain('Todavía no se cargó ningún catálogo');
    expect(html).toContain('/admin/productos/importar');
  });

  it('renders uploaded rows and counters', async () => {
    (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ role: 'owner' });
    (list.listAdminImportBatches as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1, documentId: 'batch-1', fileName: 'catalogo.xlsx', uploadedAt: '2026-07-28T12:00:00.000Z', uploadedByEmail: 'owner@example.com', totalRows: 10, createdCount: 7, updatedCount: 2, failedCount: 1, importSource: 'imported' }]);
    const { default: Page } = await import('./page');
    const html = renderToStaticMarkup(await Page());
    expect(html).toContain('catalogo.xlsx');
    expect(html).toContain('owner@example.com');
    expect(html).toContain('7');
    expect(html).toContain('2');
    expect(html).toContain('1');
  });

  it('does not load data for a client', async () => {
    (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ role: 'client' });
    const { default: Page } = await import('./page');
    expect(renderToStaticMarkup(await Page())).toContain('No tenés permisos');
    expect(list.listAdminImportBatches).not.toHaveBeenCalled();
  });
});
