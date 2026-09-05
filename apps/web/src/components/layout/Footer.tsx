'use client';

import Link from 'next/link';
import { Newsletter } from '../home/Newsletter';
import { supportEmailFor } from '@/lib/region-content';
import { Accordion } from '@/components/ui/Accordion';

function PaymentLogos() {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
      <span className="h-6 px-2 rounded-sm bg-surface-raised grid place-items-center text-[10px] font-bold italic text-text-primary">
        VISA
      </span>
      <span className="h-6 px-1.5 rounded-sm bg-surface-raised grid place-items-center">
        <svg viewBox="0 0 30 18" className="w-7 h-4" aria-label="Mastercard">
          <circle cx="11" cy="9" r="7.5" fill="#eb001b" />
          <circle cx="19" cy="9" r="7.5" fill="#f79e1b" fillOpacity="0.9" />
        </svg>
      </span>
      <span className="h-6 px-1.5 rounded-sm bg-surface-raised grid place-items-center">
        <svg viewBox="0 0 30 18" className="w-7 h-4" aria-label="Maestro">
          <circle cx="11" cy="9" r="7.5" fill="#0099df" />
          <circle cx="19" cy="9" r="7.5" fill="#ed0006" fillOpacity="0.85" />
        </svg>
      </span>
      <span className="h-6 px-2 rounded-sm bg-surface-raised grid place-items-center text-[10px] font-semibold text-text-primary">
        PayPal
      </span>
      <span className="h-6 px-2 rounded-sm bg-[#ffb3c7] grid place-items-center text-[10px] font-semibold text-text-primary">
        Klarna.
      </span>
      <span className="h-6 px-2 rounded-sm bg-surface-raised grid place-items-center text-[10px] font-bold text-text-secondary">
        G Pay
      </span>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="site-footer" style={{ backgroundColor: 'var(--color-footer)', color: '#fff' }}>
      {/* ═══ MAIN FOOTER ═══ */}
      <div className="storegrill-footer-main">
        <div className="container-fluid pt-12 pb-8">
          {/* Mobile Accordion Footer */}
          <div className="lg:hidden">
            <Accordion
              variant="flush"
              className="text-white divide-white/10"
              items={[
                {
                  id: 'footer-contact',
                  title: <span className="text-white font-bold text-sm uppercase tracking-wider">Contact</span>,
                  children: (
                    <ul className="space-y-3.5 text-sm font-medium text-white/80 pb-3">
                      <li className="flex items-start gap-2.5">
                        <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <span>Customer Support Services</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        <span className="min-w-0 break-all">{supportEmailFor('UK')}</span>
                      </li>
                    </ul>
                  ),
                },
                {
                  id: 'footer-categories',
                  title: <span className="text-white font-bold text-sm uppercase tracking-wider">Categories</span>,
                  children: (
                    <ul className="space-y-3.5 text-sm font-medium text-white/80 pb-3">
                      <li><Link href="/products?sort=newest" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">New arrivals</Link></li>
                      <li><Link href="/products?sort=popular" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Best Sellers</Link></li>
                      <li><Link href="/deals" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Sale items</Link></li>
                      <li><Link href="/blog" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Blog</Link></li>
                    </ul>
                  ),
                },
                {
                  id: 'footer-features',
                  title: <span className="text-white font-bold text-sm uppercase tracking-wider">Features</span>,
                  children: (
                    <ul className="space-y-3.5 text-sm font-medium text-white/80 pb-3">
                      <li><Link href="/deals" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Today&apos;s Deal</Link></li>
                      <li><Link href="/vendors" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Vendors</Link></li>
                      <li><Link href="/regions" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Regions</Link></li>
                      <li><Link href="/vendor/apply" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Sell on Storegrill</Link></li>
                    </ul>
                  ),
                },
                {
                  id: 'footer-customer-services',
                  title: <span className="text-white font-bold text-sm uppercase tracking-wider">Customer Services</span>,
                  children: (
                    <div className="pb-3 space-y-4">
                      <ul className="space-y-3.5 text-sm font-medium text-white/80">
                        <li><Link href="/help" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Help Centre</Link></li>
                        <li><Link href="/track" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Track Order</Link></li>
                        <li><Link href="/returns" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Returns &amp; Refunds</Link></li>
                        <li><Link href="/shipping" className="inline-flex items-center py-1 hover:opacity-70 transition-opacity">Delivery Information</Link></li>
                      </ul>
                      <div className="pt-2">
                        <Newsletter />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {/* Desktop Grid Footer */}
          <div className="hidden lg:grid grid-cols-4 gap-10 pt-16 pb-2">
            {/* Column 1: Contact */}
            <div>
              <h3 className="text-[14px] font-bold mb-5 text-white">Contact</h3>
              <ul className="space-y-3.5 text-[15px] font-medium">
                <li className="flex items-start gap-2.5">
                  <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span>Customer Support Services</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <span className="min-w-0 break-all">{supportEmailFor('UK')}</span>
                </li>
              </ul>
            </div>

            {/* Column 2: Categories */}
            <div>
              <h3 className="text-[14px] font-bold mb-5 text-white">Categories</h3>
              <ul className="space-y-3.5 text-[15px] font-medium">
                <li><Link href="/products?sort=newest" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">New arrivals</Link></li>
                <li><Link href="/products?sort=popular" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Best Sellers</Link></li>
                <li><Link href="/deals" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Sale items</Link></li>
                <li><Link href="/blog" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Blog</Link></li>
              </ul>
            </div>

            {/* Column 3: Features */}
            <div>
              <h3 className="text-[14px] font-bold mb-5 text-white">Features</h3>
              <ul className="space-y-3.5 text-[15px] font-medium">
                <li><Link href="/deals" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Today&apos;s Deal</Link></li>
                <li><Link href="/vendors" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Vendors</Link></li>
                <li><Link href="/regions" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Regions</Link></li>
                <li><Link href="/vendor/apply" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Sell on Storegrill</Link></li>
              </ul>
            </div>

            {/* Column 4: Customer Services + Newsletter */}
            <div>
              <h3 className="text-[14px] font-bold mb-5 text-white">Customer Services</h3>
              <ul className="space-y-3.5 text-[15px] font-medium mb-6">
                <li><Link href="/help" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Help Centre</Link></li>
                <li><Link href="/track" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Track Order</Link></li>
                <li><Link href="/returns" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Returns &amp; Refunds</Link></li>
                <li><Link href="/shipping" className="inline-flex items-center py-1 min-h-[44px] hover:opacity-70 transition-opacity">Delivery Information</Link></li>
              </ul>

              <Newsletter />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ COPYRIGHT BAR ═══ */}
      <div className="border-t border-white/20">
        <div className="container-fluid py-5 flex flex-col lg:flex-row items-center justify-between gap-5">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-[13px] font-medium">
            <Link href="/terms" className="inline-flex items-center min-h-[44px] hover:opacity-70 transition-opacity">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="inline-flex items-center min-h-[44px] hover:opacity-70 transition-opacity">Privacy Policy</Link>
            <Link href="/sitemap" className="inline-flex items-center min-h-[44px] hover:opacity-70 transition-opacity">Sitemap</Link>
          </div>
          <p className="text-[13px] font-medium text-center lg:text-right">
            © {new Date().getFullYear()} Storegrill Inc Ltd. All rights reserved.
          </p>
          <div className="w-full lg:w-auto flex justify-center lg:justify-end">
            <PaymentLogos />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
