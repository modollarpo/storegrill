import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import OrdersClient from './OrdersClient';

export const metadata: Metadata = { title: 'Your Orders | Storegrill', robots: { index: false } };

export default function OrdersPage() {
  return (
    <AccountShell>
      <OrdersClient />
    </AccountShell>
  );
}
