import type { Metadata } from 'next';
import Link from 'next/link';
import { getRequestContext } from '@/lib/server-context';
import { buildMetadata } from '@/lib/seo';
import { PaymentStatus } from './PaymentStatus';

export async function generateMetadata(): Promise<Metadata> {
  const { regionKey } = await getRequestContext();
  return buildMetadata({
    title: 'Order Confirmation',
    description: 'Your Storegrill order has been placed successfully.',
    path: '/checkout/confirmation',
    regionKey,
    noIndex: true,
  });
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams?: Promise<{ order?: string; email?: string; session_id?: string; token?: string }>;
}) {
  const sp = (await searchParams) || {};
  const orderNumber = sp.order || '';
  const pendingPayment = Boolean(sp.session_id || sp.token);

  return (
    <div className="container-site py-16 max-w-2xl text-center" data-testid="order-confirmation">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-emerald-50 text-feedback-success text-2xl" aria-hidden="true">✓</span>
      <h1 className="mt-5 text-displaymd font-semibold text-charcoal">
        {pendingPayment ? 'Almost there — order received!' : 'Thank you — your order is placed!'}
      </h1>
      <PaymentStatus sessionId={sp.session_id} paypalOrderId={sp.token} />
      <p className="text-sm text-smoke-500 mt-2">
        We&apos;ve sent a confirmation{sp.email ? ` to ${sp.email}` : ' to your email'}.
      </p>
      {orderNumber && (
        <p className="mt-4 inline-block rounded-md bg-smoke-100 px-4 py-2 font-mono text-sm font-bold tracking-wide">
          Order #{orderNumber}
        </p>
      )}
      <div className="card p-6 mt-8 text-left">
        <h2 className="text-sm font-bold mb-3">What happens next?</h2>
        <ol className="space-y-2.5 text-xs text-smoke-600 list-decimal pl-5">
          <li>Your vendors are notified and begin preparing your items.</li>
          <li>You&apos;ll receive shipping notifications with tracking numbers.</li>
          <li>Track everything anytime from Your Orders.</li>
        </ol>
      </div>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link href="/account/orders" className="btn btn-primary btn-lg">View Your Orders</Link>
        <Link href="/products" className="btn btn-outline btn-lg">Continue Shopping</Link>
      </div>
    </div>
  );
}
