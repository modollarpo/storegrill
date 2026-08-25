'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

interface AdminVendor {
  id: string;
  storeName: string;
  slug: string;
  status: string;
  kycStatus: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  businessLegalName?: string | null;
  businessType?: string | null;
  registrationNumber?: string | null;
  taxId?: string | null;
  countryOfRegistration?: string | null;
  website?: string | null;
  warehouseRegionKey?: string | null;
  plannedCategories?: string | null;
  description?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  payoutMethod?: string | null;
  revenueSharePct?: number;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  user?: { name?: string; email?: string };
}

interface DocumentInfo {
  name: string;
  blob?: string;
  size: number;
  uploadedAt: string;
  url?: string | null;
}

const STATUS_FILTERS = [
  ['', 'All'],
  ['UNDER_REVIEW', 'Under review'],
  ['PENDING', 'Drafts'],
  ['ACTIVE', 'Active'],
  ['SUSPENDED', 'Suspended'],
  ['REJECTED', 'Rejected'],
] as const;

function parseJson(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VendorsInner() {
  const params = useSearchParams();
  const [vendors, setVendors] = useState<AdminVendor[] | null>(null);
  const [statusFilter, setStatusFilter] = useState(params.get('status') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [docs, setDocs] = useState<Record<string, DocumentInfo[]>>({});

  const load = useCallback(() => {
    const q = statusFilter ? `?status=${statusFilter}` : '';
    api<{ vendors: AdminVendor[] }>(`/api/v1/admin/vendors${q}`)
      .then(d => { setVendors(d.vendors); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, [statusFilter]);

  useEffect(load, [load]);

  const toggleExpand = useCallback(async (vendor: AdminVendor) => {
    if (expandedId === vendor.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(vendor.id);
    if (!docs[vendor.id]) {
      try {
        const d = await api<{ documents: DocumentInfo[] }>(`/api/v1/admin/vendors/${vendor.id}/documents`);
        setDocs(prev => ({ ...prev, [vendor.id]: d.documents }));
      } catch {
        setDocs(prev => ({ ...prev, [vendor.id]: [] }));
      }
    }
  }, [expandedId, docs]);

  async function act(id: string, action: 'approve' | 'reject' | 'suspend' | 'activate') {
    setBusyId(id);
    setError(null);
    try {
      if (action === 'approve') {
        await api(`/api/v1/admin/vendors/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });
        setExpandedId(null);
      } else if (action === 'reject') {
        await api(`/api/v1/admin/vendors/${id}/reject`, { method: 'POST', body: JSON.stringify({ reviewNotes: notes }) });
        setRejectingId(null);
        setNotes('');
        setExpandedId(null);
      } else {
        await api(`/api/v1/admin/vendors/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: action === 'suspend' ? 'SUSPENDED' : 'ACTIVE' }) });
      }
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader title="Seller applications" subtitle="Review, approve and monitor storefronts" />

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="vendor-status" className="text-xs font-semibold text-slate-600">Status:</label>
        <select id="vendor-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-8 rounded-md border border-slate-300 text-xs px-2 bg-white">
          {STATUS_FILTERS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="grid gap-4">
        {vendors === null && <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />}
        {vendors?.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400">No sellers match this filter.</div>
        )}
        {vendors?.map(v => {
          const categories: string[] = (() => {
            try {
              const parsed = JSON.parse(v.plannedCategories ?? '[]');
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();
          const payout = parseJson(v.payoutMethod);

          return (
            <article key={v.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
                <button type="button" onClick={() => toggleExpand(v)} className="min-w-[220px] text-left group" aria-expanded={expandedId === v.id}>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 group-hover:underline">{v.storeName}</p>
                  <p className="text-xs text-slate-500">{v.user?.email}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">/{v.slug}{v.submittedAt ? ` · submitted ${new Date(v.submittedAt).toLocaleDateString()}` : ''}</p>
                </button>

                <dl className="flex gap-6 text-xs">
                  <div><dt className="text-slate-400">Products</dt><dd className="font-semibold tabular-nums">{v.productCount ?? 0}</dd></div>
                  <div><dt className="text-slate-400">Rating</dt><dd className="font-semibold">{v.rating > 0 ? `★ ${v.rating.toFixed(1)}` : '—'}</dd></div>
                  <div><dt className="text-slate-400">Commission</dt><dd className="font-semibold tabular-nums">{Math.round((v.revenueSharePct ?? 0) * 10) / 10}%</dd></div>
                </dl>

                <span title={`Account: ${v.status}`}><StatusBadge status={v.status} /></span>

                <div className="ml-auto flex gap-1.5 whitespace-nowrap">
                  {['UNDER_REVIEW', 'PENDING'].includes(v.status) && (
                    <>
                      <button type="button" disabled={busyId === v.id} onClick={() => act(v.id, 'approve')} className="rounded-md bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1.5 hover:bg-emerald-500 disabled:opacity-50" data-testid={`approve-${v.slug}`}>Approve</button>
                      <button type="button" disabled={busyId === v.id} onClick={() => { setRejectingId(rejectingId === v.id ? null : v.id); setNotes(v.reviewNotes ?? ''); }} className="rounded-md border border-red-300 text-red-700 text-[10px] font-bold px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50" data-testid={`reject-${v.slug}`}>Reject</button>
                    </>
                  )}
                  {v.status === 'ACTIVE' && (
                    <button type="button" disabled={busyId === v.id} onClick={() => act(v.id, 'suspend')} className="rounded-md border border-red-300 text-red-700 text-[10px] font-bold px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50">Suspend</button>
                  )}
                  {v.status === 'SUSPENDED' && (
                    <button type="button" disabled={busyId === v.id} onClick={() => act(v.id, 'activate')} className="rounded-md bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1.5 hover:bg-emerald-500 disabled:opacity-50">Reactivate</button>
                  )}
                </div>
              </div>

              {rejectingId === v.id && (
                <div className="border-t border-slate-100 bg-red-50/40 p-5" data-testid={`reject-panel-${v.slug}`}>
                  <label htmlFor={`notes-${v.id}`} className="block text-xs font-bold text-slate-700 mb-1.5">Rejection reason (sent to the applicant)</label>
                  <textarea
                    id={`notes-${v.id}`}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    minLength={5}
                    rows={3}
                    placeholder="e.g. Registration number could not be verified with the registry."
                    className="w-full rounded-md border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="mt-3 flex gap-2 justify-end">
                    <button type="button" onClick={() => setRejectingId(null)} className="rounded-md border border-slate-300 text-slate-600 text-xs font-semibold px-3 py-1.5 hover:bg-white">Cancel</button>
                    <button type="button" disabled={busyId === v.id || notes.trim().length < 5} onClick={() => act(v.id, 'reject')} className="rounded-md bg-red-600 text-white text-xs font-bold px-4 py-1.5 hover:bg-red-500 disabled:opacity-50">Send rejection</button>
                  </div>
                </div>
              )}

              {expandedId === v.id && (
                <div className="border-t border-slate-100 bg-slate-50 p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs" data-testid={`detail-${v.slug}`}>
                  <section>
                    <h3 className="font-bold text-slate-500 uppercase tracking-wide mb-2">Business</h3>
                    <dl className="grid grid-cols-[130px_1fr] gap-y-1.5">
                      <dt className="text-slate-400">Legal name</dt><dd className="font-medium">{v.businessLegalName || '—'}</dd>
                      <dt className="text-slate-400">Type</dt><dd className="font-medium capitalize">{v.businessType || '—'}</dd>
                      <dt className="text-slate-400">Registration</dt><dd className="font-mono">{v.registrationNumber || '—'}</dd>
                      <dt className="text-slate-400">Tax ID</dt><dd className="font-mono">{v.taxId || '—'}</dd>
                      <dt className="text-slate-400">Country</dt><dd>{v.countryOfRegistration || '—'}</dd>
                      <dt className="text-slate-400">Website</dt><dd className="truncate">{v.website || '—'}</dd>
                    </dl>
                  </section>

                  <section>
                    <h3 className="font-bold text-slate-500 uppercase tracking-wide mb-2">Store & operations</h3>
                    <dl className="grid grid-cols-[130px_1fr] gap-y-1.5">
                      <dt className="text-slate-400">Support email</dt><dd>{v.supportEmail || '—'}</dd>
                      <dt className="text-slate-400">Support phone</dt><dd>{v.supportPhone || '—'}</dd>
                      <dt className="text-slate-400">Warehouse region</dt><dd>{v.warehouseRegionKey || 'US'}</dd>
                      <dt className="text-slate-400">Categories</dt><dd>{categories.length ? categories.join(', ') : '—'}</dd>
                      <dt className="text-slate-400">Description</dt><dd className="leading-relaxed">{v.description || '—'}</dd>
                    </dl>
                  </section>

                  <section>
                    <h3 className="font-bold text-slate-500 uppercase tracking-wide mb-2">Payout</h3>
                    <dl className="grid grid-cols-[130px_1fr] gap-y-1.5">
                      <dt className="text-slate-400">Method</dt><dd className="font-medium capitalize">{String(payout.type ?? '—')}</dd>
                      {payout.type === 'bank' && (
                        <>
                          <dt className="text-slate-400">Bank</dt><dd>{String(payout.bankName ?? '—')}</dd>
                          <dt className="text-slate-400">Account</dt><dd className="font-mono">••••{String(payout.accountLast4 ?? '')}</dd>
                        </>
                      )}
                      {payout.type === 'paypal' && (
                        <>
                          <dt className="text-slate-400">PayPal</dt><dd>{String(payout.paypalEmail ?? '—')}</dd>
                        </>
                      )}
                      <dt className="text-slate-400">Terms accepted</dt><dd>{payout.acceptedTermsAt ? new Date(String(payout.acceptedTermsAt)).toLocaleString() : '—'}</dd>
                    </dl>
                  </section>

                  <section>
                    <h3 className="font-bold text-slate-500 uppercase tracking-wide mb-2">Documents ({docs[v.id]?.length ?? 0})</h3>
                    {docs[v.id] === undefined && <p className="text-slate-400 animate-pulse">Loading…</p>}
                    {docs[v.id]?.length === 0 && <p className="text-slate-400">No supporting documents uploaded.</p>}
                    <ul className="space-y-1.5">
                      {docs[v.id]?.map(d => (
                        <li key={d.blob ?? d.name} className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded bg-white border border-slate-200 grid place-items-center text-[9px] font-bold text-slate-400 shrink-0">DOC</span>
                          {d.url ? (
                            <a href={d.url} target="_blank" rel="noreferrer noopener" className="font-medium text-indigo-700 hover:underline truncate max-w-[240px]">{d.name}</a>
                          ) : (
                            <span className="font-medium text-slate-600 truncate max-w-[240px]">{d.name}</span>
                          )}
                          <span className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">{formatBytes(d.size)}</span>
                        </li>
                      ))}
                    </ul>
                    {v.reviewedAt && (
                      <p className="mt-3 pt-3 border-t border-slate-200 text-slate-500">
                        Last reviewed {new Date(v.reviewedAt).toLocaleString()}{v.reviewNotes ? ` — “${v.reviewNotes}”` : ''}
                      </p>
                    )}
                  </section>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}

export default function AdminVendorsPage() {
  return (
    <Suspense>
      <VendorsInner />
    </Suspense>
  );
}
