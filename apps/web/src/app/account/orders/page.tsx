'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalMinorUnits: number;
  currencyCode: string;
  items: Array<{ id: string; name: string; quantity: number; product?: { thumbnail?: string } }>;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  DELIVERED: 'success', PAID: 'info', SHIPPED: 'info', PROCESSING: 'warning',
  PENDING: 'warning', CANCELLED: 'danger', REFUNDED: 'danger',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    api<{ orders: OrderRow[] }>('/api/v1/orders?limit=20')
      .then(d => setOrders(d.orders))
      .catch(() => setOrders([]));
  }, []);

  return (
    <div data-testid="orders-list">
      <h2 className="text-displaysm font-semibold mb-4">Your Orders</h2>
      {orders === null ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} height={120} className="w-full" rounded="md" />)}</div>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-smoke-500">You have no orders yet.</p>
          <Link href="/products" className="btn btn-primary btn-sm mt-4">Start shopping</Link>
        </div>
      ) : (
        <ul className="space-y-4" role="list">
          {orders.map(order => (
            <li key={order.id}>
              <Link href={`/account/orders/${order.id}`} className="card p-0 overflow-hidden block hover:shadow-card-hover transition-shadow">
                <header className="bg-smoke-50 border-b border-smoke-100 px-5 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-2xs text-smoke-600">
                  <span><strong className="block text-charcoal">ORDER PLACED</strong>{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span><strong className="block text-charcoal">TOTAL</strong><PriceDisplay amountMinorUnits={order.totalMinorUnits} currencyCode={order.currencyCode} size="sm" /></span>
                  <span className="ml-auto"><Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'} size="md">{order.status}</Badge></span>
                </header>
                <div className="px-5 py-4">
                  <p className="text-xs font-bold text-charcoal mb-3">#{order.orderNumber}</p>
                  <ul className="flex gap-3 flex-wrap" role="list" aria-label={`Items in order ${order.orderNumber}`}>
                    {(order.items || []).slice(0, 4).map(item => (
                      <li key={item.id} className="flex items-center gap-2">
                        <span className="relative w-11 h-11 rounded-sm border border-smoke-150 bg-surface-raised overflow-hidden shrink-0">
                          {item.product?.thumbnail && <Image src={item.product.thumbnail} alt="" fill sizes="44px" className="object-contain p-0.5" />}
                        </span>
                        <span className="text-xs text-smoke-600 max-w-[24ch] truncate">{item.name} ×{item.quantity}</span>
                      </li>
                    ))}
                    {(order.items?.length ?? 0) > 4 && (
                      <li className="text-xs text-tealink self-center">+{order.items.length - 4} more</li>
                    )}
                  </ul>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
