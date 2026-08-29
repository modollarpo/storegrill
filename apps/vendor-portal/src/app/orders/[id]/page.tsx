'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { VendorShell } from '@/components/VendorShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { inputClass } from '@/components/ui/FormLayout';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  regionKey: string;
  currencyCode: string;
  customerName: string;
  customerEmail?: string;
  shippingAddress: { street?: string; city?: string; state?: string; zip?: string; country?: string };
  items: Array<{ id: string; name: string; sku: string; image?: string; quantity: number; unitPriceMinorUnits: number; totalMinorUnits: number }>;
  shipments: Array<{
    id: string;
    carrier: string;
    trackingNumber?: string | null;
    status: string;
    events: Array<{ id: string; status: string; description?: string; timestamp: string }>;
  }>;
}

export default function VendorOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier] = useState('');
  const [shipping, setShipping] = useState(false);

  const load = useCallback(() => {
    api<{ order: OrderDetail }>(`/api/v1/vendors/me/orders/${params.id}`)
      .then(d => { setOrder(d.order); setTracking(d.order.shipments[0]?.trackingNumber ?? ''); })
      .catch(e => { if (e instanceof ApiError && e.status === 404) setNotFound(true); });
  }, [params.id]);

  useEffect(load, [load]);

  async function markShipped() {
    if (!order || shipping) return;
    setShipping(true);
    try {
      await api(`/api/v1/vendors/me/orders/${order.id}/ship`, {
        method: 'POST',
        body: JSON.stringify({ trackingNumber: tracking.trim() || undefined, carrier: carrier.trim() || undefined }),
      });
      toastSuccess(`Order #${order.orderNumber} marked as shipped`);
      load();
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Failed to update shipment');
    } finally {
      setShipping(false);
    }
  }

  if (notFound) {
    return (
      <VendorShell>
        <div className="bg-surface-raised rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">Order not found in your store.</p>
          <Link href="/orders" className="text-xs font-semibold text-indigo-600 hover:underline mt-2 inline-block">← Back to orders</Link>
        </div>
      </VendorShell>
    );
  }

  return (
    <VendorShell>
      <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 mb-3">
        <svg className="w-3 h-3 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        All orders
      </Link>

      {!order ? (
        <div className="space-y-3">
          <div className="h-20 rounded-lg bg-surface-raised border border-slate-200 animate-pulse" />
          <div className="h-64 rounded-lg bg-surface-raised border border-slate-200 animate-pulse" />
        </div>
      ) : (
        <>
          <header className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
            <h1 className="text-lg font-bold text-slate-900 font-mono">#{order.orderNumber}</h1>
            <StatusBadge status={order.status} size="md" />
            <span className="text-xs text-slate-400 ml-auto">
              Placed {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start mb-4">
            {/* Line items */}
            <section aria-label="Your items in this order" className="bg-surface-raised rounded-lg border border-slate-200 overflow-hidden">
              <h2 className="text-sm font-bold px-5 py-3.5 border-b border-slate-100">Items ({order.items.length})</h2>
              <ul className="divide-y divide-slate-100">
                {order.items.map(item => (
                  <li key={item.id} className="px-5 py-3 flex items-center gap-4">
                    {item.image ? (
                                            <img src={item.image} alt="" className="w-11 h-11 rounded-md object-contain border border-slate-100 bg-surface-raised p-0.5 shrink-0" />
                    ) : (
                      <span className="w-11 h-11 rounded-md bg-slate-100 shrink-0" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU {item.sku} · Qty {item.quantity} · {money(item.unitPriceMinorUnits)} ea</p>
                    </div>
                    <p className="text-xs font-bold [font-variant-numeric:tabular-nums]">{money(item.totalMinorUnits)}</p>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3 bg-slate-50/70 flex justify-between items-center border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-600">Your order subtotal</span>
                <span className="text-sm font-bold [font-variant-numeric:tabular-nums]">
                  {money(order.items.reduce((s, i) => s + i.totalMinorUnits, 0), order.currencyCode)}
                </span>
              </div>
            </section>

            {/* Right rail */}
            <div className="space-y-4">
              <section aria-label="Customer and delivery" className="bg-surface-raised rounded-lg border border-slate-200 p-4 text-xs">
                <h2 className="font-bold text-slate-900 mb-2">Delivery</h2>
                <p className="text-slate-700">{order.customerName}</p>
                {order.customerEmail && <p className="text-slate-400 mb-2">{order.customerEmail}</p>}
                <address className="not-italic text-slate-500 leading-relaxed">
                  {order.shippingAddress.street}
                  <br />
                  {[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(', ')} {order.shippingAddress.zip}
                  <br />
                  {order.shippingAddress.country || order.regionKey}
                </address>
              </section>

              <section aria-label="Ship this order" className="bg-surface-raised rounded-lg border border-slate-200 p-4">
                <h2 className="font-bold text-slate-900 text-xs mb-2.5">Fulfilment</h2>
                <div className="space-y-2">
                  <label className="block">
                    <span className="sr-only">Carrier</span>
                    <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Carrier (optional)" className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="sr-only">Tracking number</span>
                    <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Tracking number" data-testid="tracking-input" className={`${inputClass} font-mono`} />
                  </label>
                  <button
                    type="button"
                    onClick={markShipped}
                    disabled={shipping}
                    data-testid="mark-shipped"
                    aria-busy={shipping}
                    className="w-full h-9 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {shipping ? 'Saving…' : 'Mark as Shipped'}
                  </button>
                  <button type="button" disabled className="w-full h-9 rounded-md border border-slate-200 text-xs font-medium text-slate-400 cursor-not-allowed" title="Available once payment provider refunds are configured">
                    Process refund
                  </button>
                </div>
              </section>
            </div>
          </div>

          {/* Timeline */}
          <section aria-label="Shipment timeline" className="bg-surface-raised rounded-lg border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Timeline</h2>
            {order.shipments.length === 0 ? (
              <p className="text-xs text-slate-400">No shipments yet — add tracking above when you dispatch.</p>
            ) : (
              <ol className="relative ml-2 border-l border-slate-200 space-y-4">
                {order.shipments[0].events.map(evt => (
                  <li key={evt.id} className="pl-5 relative">
                    <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50" aria-hidden="true" />
                    <p className="text-xs font-semibold text-slate-800">{evt.status}</p>
                    {evt.description && <p className="text-[11px] text-slate-500">{evt.description}</p>}
                    <time className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleString()}</time>
                  </li>
                ))}
                <li className="pl-5 relative">
                  <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-dashed border-slate-300 bg-surface-raised" aria-hidden="true" />
                  <p className="text-xs font-medium text-slate-400">Delivered (pending)</p>
                </li>
              </ol>
            )}
            {order.shipments[0]?.trackingNumber && (
              <p className="mt-3 text-[11px] text-slate-500">
                Carrier <strong className="text-slate-700">{order.shipments[0].carrier}</strong> · Tracking{' '}
                <strong className="font-mono text-slate-700">{order.shipments[0].trackingNumber}</strong>
              </p>
            )}
          </section>
        </>
      )}
    </VendorShell>
  );
}

function money(minor: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100);
  } catch {
    return String(minor / 100);
  }
}
