'use client';

import { useState } from 'react';

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [orderNo, setOrderNo] = useState('');

  if (sent) {
    return (
      <div className="card p-8 text-center" role="status">
        <p className="text-3xl mb-2" aria-hidden="true">✓</p>
        <h2 className="text-sm font-bold text-charcoal">Message received</h2>
        <p className="text-xs text-smoke-600 mt-2 leading-relaxed max-w-sm mx-auto">
          Reference <span className="font-mono font-bold">SG-{Math.random().toString(36).slice(2, 8).toUpperCase()}</span>.
          We reply within one working day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); setSent(true); }}
      className="card p-6 space-y-4"
      aria-labelledby="contact-form-heading"
    >
      <h2 id="contact-form-heading" className="text-sm font-bold text-charcoal">Send us a message</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-name" className="block text-xs font-semibold text-smoke-600 mb-1">Full name</label>
          <input id="cf-name" name="name" required className="input w-full h-10" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="cf-email" className="block text-xs font-semibold text-smoke-600 mb-1">Email</label>
          <input id="cf-email" name="email" type="email" required className="input w-full h-10" autoComplete="email" />
        </div>
      </div>
      <div>
        <label htmlFor="cf-order" className="block text-xs font-semibold text-smoke-600 mb-1">Order number (optional)</label>
        <input
          id="cf-order"
          name="order"
          value={orderNo}
          onChange={e => setOrderNo(e.target.value)}
          placeholder="SG-XXXXXX"
          pattern="SG-[A-Za-z0-9]{4,10}"
          className="input w-full h-10 font-mono"
        />
      </div>
      <div>
        <label htmlFor="cf-topic" className="block text-xs font-semibold text-smoke-600 mb-1">Topic</label>
        <select id="cf-topic" name="topic" required defaultValue="" className="input w-full h-10">
          <option value="" disabled>Choose a topic…</option>
          <option>An order I placed</option>
          <option>Delivery question</option>
          <option>Returns &amp; refunds</option>
          <option>Payment issue</option>
          <option>Selling on Storegrill</option>
          <option>Something else</option>
        </select>
      </div>
      <div>
        <label htmlFor="cf-msg" className="block text-xs font-semibold text-smoke-600 mb-1">Message</label>
        <textarea id="cf-msg" name="message" required rows={5} className="input w-full resize-y" />
      </div>
      <button type="submit" className="btn btn-primary btn-md rounded-full px-8">Send message</button>
    </form>
  );
}
