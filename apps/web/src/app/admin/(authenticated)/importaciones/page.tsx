import React from 'react';
import Link from 'next/link';
import { getServerSession } from '@/lib/admin/session';
import { listAdminImportBatches } from '@/lib/admin/strapi-admin';
import type { ImportBatch } from '@/lib/strapi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { title: 'Historial Excel · Ene Muebles', robots: { index: false, follow: false } };

const number = new Intl.NumberFormat('es-CL');
const date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

export default async function ImportacionesPage() {
  const session = await getServerSession();
  if (session?.role !== 'owner') {
    return <div className="mx-auto max-w-3xl px-6 py-12"><p>No tenés permisos para ver el historial de importaciones.</p><Link href="/admin" className="mt-4 inline-block underline">Volver al panel</Link></div>;
  }
  const batches = await listAdminImportBatches();
  return <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
    <header className="border-b border-ink-line pb-8"><p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe">Catálogo</p><h1 className="t-display mt-3 text-4xl">Importaciones</h1><p className="mt-3 max-w-2xl text-sm text-ink-mute">Historial de cargas desde Excel</p></header>
    {batches.length === 0 ? <div className="mt-10 border border-ink-line p-10 text-center"><p className="text-ink-mute">Todavía no se cargó ningún catálogo. Usá Importar (Excel) para empezar.</p><Link href="/admin/productos/importar" className="mt-5 inline-block border-b border-ink pb-1 text-sm">Importar (Excel)</Link></div> : <div className="mt-10 overflow-x-auto border-t border-ink"><table className="w-full min-w-[900px] text-left text-sm"><thead className="t-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute"><tr>{['Archivo','Subido','Subido por','Total','Creados','Actualizados','Fallidos',''].map((label) => <th key={label} className="border-b border-ink-line px-3 py-3 font-normal">{label}</th>)}</tr></thead><tbody>{batches.map((batch: ImportBatch) => <tr key={batch.documentId ?? batch.id} className="border-b border-ink-line"><td className="px-3 py-4 font-medium">{batch.fileName}</td><td className="px-3 py-4">{formatDate(batch.uploadedAt)}</td><td className="px-3 py-4">{batch.uploadedByEmail ?? '—'}</td><td className="px-3 py-4">{number.format(batch.totalRows ?? 0)}</td><td className="px-3 py-4">{number.format(batch.createdCount ?? 0)}</td><td className="px-3 py-4">{number.format(batch.updatedCount ?? 0)}</td><td className={`px-3 py-4 ${batch.failedCount ? 'text-red-700' : ''}`}>{number.format(batch.failedCount ?? 0)}</td><td className="px-3 py-4"><Link href={`/admin?importBatch=${encodeURIComponent(batch.documentId ?? String(batch.id))}`} className="whitespace-nowrap text-xs underline underline-offset-4">Ver productos importados</Link></td></tr>)}</tbody></table></div>}
  </div>;
}

function formatDate(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '—' : date.format(parsed); }
