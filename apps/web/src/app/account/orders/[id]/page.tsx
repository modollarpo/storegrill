'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import { Badge } from '@/components/ui/Badge';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  subtotalMinorUnits: number;
  taxMinorUnits: number;
  shippingMinorUnits: number;
  totalMinorUnits: number;
  currencyCode: string;
  items: Array<{ id: string; name: string; quantity: number; unitPriceMinorUnits: number; product?: { thumbnail?: string; slug?: string } }>;
  shipments?: Array<{ id: string; carrier: string; trackingNumber?: string; status: string; events?: Array<{ id: string; status: string; description?: string; timestamp: string }> }>;
}

const TIMELINE = ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<OrderDetail | null | 'error'>(null);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      api<{ order: OrderDetail }>(`/api/v1/orders/${p.id}`)
        .then(d => setOrder(d.order))
        .catch(() => setOrder('error'));
    });
  }, [params]);

  if (order === null || !id) return <div className="container-site py-10"><Skeleton height={300} rounded="lg" /></div>;
  if (order === 'error') return <div className="container-site py-16 text-center"><p className="font-semibold">Order not found</p></div>;

  const stageIndex = TIMELINE.indexOf(order.status);

  return (
    <div className="container-site py-8 max-w-content" data-testid="order-detail">
      <Link href="/account/orders" className="btn btn-link text-xs mb-4">← All orders</Link>

      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-displaymd font-semibold">Order #{order.orderNumber}</h1>
        <Badge variant="info" size="md">{order.status}</Badge>
      </header>

      <ol className="flex flex-wrap gap-2 mb-8" aria-label="Order progress">
        {TIMELINE.map((stage, i) => (
          <li key={stage} className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full grid place-items-center text-2xs font-bold ${
                i <= stageIndex ? 'bg-feedback-success text-white' : 'bg-smoke-100 text-smoke-400'
              }`}
              aria-current={i === stageIndex ? 'step' : undefined}
            >
              {i < stageIndex ? '✓' : i + 1}
            </span>
            <span className={`text-2xs font-medium ${i === stageIndex ? 'text-charcoal' : 'text-smoke-400'}`}>{stage}</span>
            {i < TIMELINE.length - 1 && <span aria-hidden="true" className="w-4 h-px bg-smoke-200" />}
          </li>
        ))}
      </ol>

      <div className="grid md:grid-cols-[1fr_280px] gap-6 items-start">
        <section className="card divide-y divide-smoke-100 px-5" aria-label="Items in this order">
          {order.items.map(item => (
            <div key={item.id} className="py-4 flex gap-4">
              <span className="relative w-16 h-16 rounded-md border border-smoke-150 bg-surface-raised overflow-hidden shrink-0">
                {item.product?.thumbnail && <Image src={item.product.thumbnail} alt="" fill sizes="64px" className="object-contain p-1" />}
              </span>
              <span className="min-w-0 flex-1">
                {item.product?.slug && (
                  <Link href={`/products/${item.product.slug}`} className="block text-xs font-semibold hover:text-tealink-hover hover:underline truncate">
                    {item.name}
                  </Link>
                )}
                <span className="block text-2xs text-smoke-500 mt-1">Qty {item.quantity}</span>
                <PriceDisplay amountMinorUnits={item.unitPriceMinorUnits * item.quantity} currencyCode={order.currencyCode} size="sm" className="mt-1" />
              </span>
            </div>
          ))}
        </section>

        <aside className="card p-5 space-y-2 text-xs" aria-label="Order summary">
          <h2 className="text-sm font-bold mb-2">Summary</h2>
          {[['Subtotal', order.subtotalMinorUnits], ['Shipping', order.shippingMinorUnits], ['Tax', order.taxMinorUnits]].map(([label, v]) => (
            <div key={String(label)} className="flex justify-between"><span className="text-smoke-600">{label}</span><PriceDisplay amountMinorUnits={Number(v)} currencyCode={order.currencyCode} size="sm" /></div>
          ))}
          <div className="border-t border-smoke-150 pt-2 mt-2 flex justify-between font-bold text-sm">
            <span>Total</span><PriceDisplay amountMinorUnits={order.totalMinorUnits} currencyCode={order.currencyCode} size="md" />
          </div>
          {(order.shipments?.[0]?.trackingNumber) && (
            <p className="pt-3 border-t border-smoke-150 text-2xs text-smoke-500">
              Tracking ({order.shipments[0].carrier}): <strong className="text-charcoal font-mono">{order.shipments[0].trackingNumber}</strong>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
