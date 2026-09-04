"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";

export function Newsletter() {
  const [email, setEmail] = useState<string>("");
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubscribed(true);
      setEmail("");
    } catch {
      setError("Could not subscribe right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h3 className="text-[14px] font-bold mb-4 text-white">Sign Up For News</h3>
      {subscribed ? (
        <p role="status" className="text-sm font-semibold text-white bg-white/10 rounded-xl px-4 py-3 border border-white/20">
          You are signed up — look out for great deals in your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <input
              id="footer-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full min-w-0 h-[46px] px-4 rounded-xl sm:rounded-r-none border-none bg-white/15 text-white text-sm outline-none placeholder:text-white/40 focus:bg-white/20 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto shrink-0 h-[46px] px-5 rounded-xl sm:rounded-l-none bg-ember text-white text-sm font-bold cursor-pointer hover:bg-ember-dark transition-colors disabled:opacity-60 border-none"
            >
              {loading ? "..." : "Subscribe"}
            </button>
          </div>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </form>
      )}
    </>
  );
}

export function NewsletterSection() {
  const [email, setEmail] = useState<string>("");
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubscribed(true);
      setEmail("");
    } catch {
      setError("Could not subscribe right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-midnight">
      <div className="absolute top-[-30%] left-[-10%] w-[50%] h-[180%] bg-ember rounded-full blur-[100px] opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-40%] right-[5%] w-[55%] h-[120%] bg-deal rounded-full blur-[90px] opacity-20 pointer-events-none" />

      <div className="relative z-10 px-8 md:px-16 py-16 md:py-20 flex flex-col md:flex-row items-center gap-10 md:gap-20">
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-xs font-bold text-white/70 mb-6 backdrop-blur-sm">
            <svg className="w-3.5 h-3.5 text-ember" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
              <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
            </svg>
            Newsletter
          </div>
          <h2 id="newsletter-heading" className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Stay ahead of<br className="hidden md:block" /> the curve
          </h2>
          <p className="text-white/60 text-base md:text-lg max-w-md leading-relaxed">
            Get the latest articles, product updates, and exclusive deals delivered straight to your inbox. No spam, ever.
          </p>
          <div className="flex items-center gap-4 mt-6 justify-center md:justify-start">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-midnight flex items-center justify-center text-xs font-bold text-white bg-ember">A</div>
              <div className="w-8 h-8 rounded-full border-2 border-midnight flex items-center justify-center text-xs font-bold text-white bg-deal">B</div>
              <div className="w-8 h-8 rounded-full border-2 border-midnight flex items-center justify-center text-xs font-bold text-white bg-tealink">C</div>
              <div className="w-8 h-8 rounded-full border-2 border-midnight flex items-center justify-center text-xs font-bold text-white bg-amber-600">D</div>
            </div>
            <p className="text-white/50 text-sm font-semibold">Join 12,000+ readers</p>
          </div>
        </div>

        <div className="w-full md:w-auto md:min-w-[400px]">
          {subscribed ? (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-ember/20 border border-ember/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-ember" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2">You are in!</h3>
              <p className="text-white/60 text-sm">Welcome to the Storegrill Journal. Check your inbox for a confirmation.</p>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <p className="text-sm font-bold text-white/70 mb-5 uppercase tracking-widest">Subscribe free</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="blog-newsletter-email" className="sr-only">Email address</label>
                  <input
                    id="blog-newsletter-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full h-[52px] px-5 rounded-xl bg-white text-midnight text-sm font-semibold placeholder:text-midnight/40 focus:outline-none focus:ring-2 focus:ring-ember transition-all border-0"
                  />
                </div>
                {error && (
                  <p className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] rounded-xl bg-ember text-white font-extrabold text-sm hover:bg-ember/90 active:scale-[0.98] transition-all shadow-xl shadow-ember/30 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Subscribing...
                    </>
                  ) : (
                    <>
                      Subscribe now
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </>
                  )}
                </button>
                <p className="text-center text-white/30 text-xs">No spam. Unsubscribe anytime.</p>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}