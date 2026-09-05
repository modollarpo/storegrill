'use client';

import { useState } from 'react';

interface TrackingEventView {
  status: string;
  location: string | null;
  description: string | null;
  timestamp: string;
}

interface ShipmentView {
  id: string;
  carrier: string;
  carrierCode: string;
  trackingNumber: string | null;
  status: string;
  statusLabel: string;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  events: TrackingEventView[];
}

interface TrackResponse {
  order: {
    orderNumber: string;
    status: string;
    shipments: ShipmentView[];
  };
}

export function TrackForm() {
  const [orderNo, setOrderNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackResponse | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = orderNo.trim().toUpperCase();
    if (!v) {
      setError('Please enter an order number.');
      return;
    }
    setError(null);
    setLoading(true);
    setData(null);

    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiHost}/api/v1/tracking/by-order/${encodeURIComponent(v)}`, {
        credentials: 'omit',
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError('Order not found. Please check your order number.');
        } else {
          setError('Unable to fetch tracking info. Please try again later.');
        }
        return;
      }
      const json = (await res.json()) as TrackResponse;
      setData(json);
    } catch {
      setError('Network error while fetching tracking info.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleTrack} className="w-full" aria-labelledby="track-heading">
        <label htmlFor="track-order" className="block text-sm font-bold text-charcoal mb-2">
          Order number
        </label>
        <div className="flex gap-3">
          <input
            id="track-order"
            value={orderNo}
            onChange={e => setOrderNo(e.target.value)}
            placeholder="e.g. SG-12345"
            autoComplete="off"
            className="input flex-1 h-12 font-mono text-base px-4 rounded-xl border border-border"
          />
          <button type="submit" disabled={loading} className="btn btn-primary h-12 px-8 rounded-xl font-bold shrink-0">
            {loading ? 'Searching...' : 'Track'}
          </button>
        </div>
        {error && <p className="text-sm text-feedback-danger font-semibold mt-3" role="alert">{error}</p>}
      </form>

      {data && (
        <div className="mt-8 pt-8 border-t border-border animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-smoke-500 font-bold">Order</span>
              <h3 className="text-xl font-extrabold text-charcoal">{data.order.orderNumber}</h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-ember/10 text-ember">
              {data.order.status}
            </span>
          </div>

          {data.order.shipments.length === 0 ? (
            <div className="p-6 bg-surface-raised rounded-xl text-center text-smoke-600">
              No shipments have been dispatched for this order yet.
            </div>
          ) : (
            <div className="space-y-6">
              {data.order.shipments.map(shipment => (
                <div key={shipment.id} className="p-6 bg-surface-raised border border-border rounded-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-smoke-500">{shipment.carrier}</span>
                      <p className="font-mono text-sm font-semibold text-charcoal">
                        {shipment.trackingNumber ? `Tracking: ${shipment.trackingNumber}` : 'No tracking number provided'}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-charcoal text-white">
                      {shipment.statusLabel}
                    </span>
                  </div>

                  {shipment.events.length === 0 ? (
                    <p className="text-xs text-smoke-500 italic">Awaiting initial carrier scan.</p>
                  ) : (
                    <ol className="relative border-s border-border ml-3 space-y-4 mt-6">
                      {shipment.events.map((event, idx) => (
                        <li key={idx} className="ml-6">
                          <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-ember ring-4 ring-surface" />
                          <time className="text-xs font-semibold text-smoke-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </time>
                          <p className="text-sm font-bold text-charcoal mt-0.5">{event.description || event.status}</p>
                          {event.location && <p className="text-xs text-smoke-600">{event.location}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
