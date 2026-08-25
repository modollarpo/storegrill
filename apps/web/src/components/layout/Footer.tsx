'use client';

import Link from 'next/link';
import { useState } from 'react';

const FOOTER_NAV = [
  {
    heading: 'Help & support',
    links: [
      ['Contact us', '/contact'] as const,
      ['Order tracker', '/track'] as const,
      ['Delivery information', '/shipping'] as const,
      ['Returns & refunds', '/returns'] as const,
      ['Help centre', '/help'] as const,
      ['Product recalls', '/recalls'] as const,
    ],
  },
  {
    heading: 'Services',
    links: [
      ['Repair', '/help'] as const,
      ['Protection plans', '/payments'] as const,
      ['Installation', '/help'] as const,
      ['Recycling', '/about'] as const,
    ],
  },
  {
    heading: 'Shopping with us',
    links: [
      ['All products', '/products'] as const,
      ['Deals', '/deals'] as const,
      ['Spread the cost', '/payments'] as const,
      ['Vendors', '/vendors'] as const,
      ['Choose your region', '/regions'] as const,
    ],
  },
  {
    heading: 'About Storegrill',
    links: [
      ['About us', '/about'] as const,
      ['Sell on Storegrill', '/sell'] as const,
      ['Careers', '/about'] as const,
      ['Environment', '/about'] as const,
    ],
  },
  {
    heading: 'Legal',
    links: [
      ['Terms & conditions', '/terms'] as const,
      ['Privacy & cookies policy', '/privacy'] as const,
      ['Cookie settings', '/cookies'] as const,
      ['Accessibility', '/help'] as const,
      ['Sitemap', '/sitemap'] as const,
    ],
  },
];

function PaymentLogos() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Accepted payment methods">
      <span className="h-6 px-2 rounded-xs bg-white grid place-items-center text-xs font-bold italic tracking-tight text-primary dark:text-[1a1f71]">VISA</span>
      <span className="h-6 px-1.5 rounded-xs bg-white grid place-items-center">
        <svg viewBox="0 0 30 18" className="w-7 h-4" aria-label="Mastercard">
          <circle cx="11" cy="9" r="7.5" fill="#eb001b" />
          <circle cx="19" cy="9" r="7.5" fill="#f79e1b" fillOpacity="0.9" />
        </svg>
      </span>
      <span className="h-6 px-1.5 rounded-xs bg-white grid place-items-center">
        <svg viewBox="0 0 30 18" className="w-7 h-4" aria-label="Maestro">
          <circle cx="11" cy="9" r="7.5" fill="#0099df" />
          <circle cx="19" cy="9" r="7.5" fill="#ed0006" fillOpacity="0.85" />
        </svg>
      </span>
      <span className="h-6 px-2 rounded-xs bg-white grid place-items-center text-primary dark:text-[0a0a0a]">PayPal</span>
      <span className="h-6 px-2 rounded-xs bg-[#ffb3c7] grid place-items-center text-primary dark:text-[0a0a0a]">Klarna.</span>
      <span className="h-6 px-2 rounded-xs bg-white grid place-items-center text-primary font-bold dark:text-[5f6368]">G Pay</span>
      <span className="h-6 px-2 rounded-xs bg-white grid place-items-center text-primary font-bold dark:text-[1d1d1f]">Mastercard</span>
    </div>
  );
}

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubscribed(true);
    setEmail('');
  }

  return (
    <footer className="bg-footerdark text-text-inverse">
      <div className="border-b border-white/10 py-10">
        <div className="container-site flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-heading-lg font-bold text-white">Sign up to our emails</h2>
            <p className="text-body-sm text-white/70 mt-1">Be the first to hear about the latest offers, new products and exclusive events.</p>
          </div>
          {subscribed ? (
            <p role="status" className="text-sm font-semibold text-stockgreen bg-white rounded-xs px-4 py-3">
              You&apos;re signed up — look out for great deals in your inbox.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
              <label htmlFor="footer-email" className="sr-only">Email address</label>
              <input
                id="footer-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="input sm:w-80 h-11 border-transparent"
              />
              <button type="submit" className="btn btn-primary h-11 px-8">
                Sign up
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="container-site py-12 lg:py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12">
          {FOOTER_NAV.map(col => (
            <div key={col.heading}>
              <h3 className="text-body-sm font-bold text-white mb-4 uppercase tracking-wider">{col.heading}</h3>
              <ul className="space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="inline-block text-sm text-white/70 hover:text-white hover:underline underline-offset-4 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site py-8 flex flex-col items-center gap-6">
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/60">
            <Link href="/terms" className="hover:text-white transition-colors">Terms &amp; conditions</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy &amp; cookies policy</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookie settings</Link>
            <Link href="/recalls" className="hover:text-white transition-colors">Product recalls</Link>
            <Link href="/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
          </nav>

          <PaymentLogos />
        </div>

        <div className="container-site pb-8">
          <p className="text-xs text-white/40 leading-relaxed text-center">
            © {new Date().getFullYear()} Storegrill Inc Ltd (Company No. 14581073). Registered in England &amp; Wales.
          </p>
        </div>
      </div>
    </footer>
  );
}
