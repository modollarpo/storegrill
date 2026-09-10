import Link from 'next/link';
import Image from 'next/image';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import type { HomeFeaturedSection } from '@/lib/home-content-build';

export function FeaturedBanner({ featured }: { featured: HomeFeaturedSection }) {
  const {
    eyebrow,
    title,
    subtitle,
    href,
    ctaText,
    secondaryCtaText,
    secondaryHref,
    stats,
    products,
  } = featured;

  return (
    <section className="sm:col-span-2 lg:col-span-4 relative overflow-hidden rounded-lg border border-black/5 bg-white shadow-card lg:h-[240px]">
      <div className="grid lg:h-full lg:grid-cols-[1fr_1.4fr] grid-auto-rows-1fr">
        <div className="relative overflow-hidden bg-gradient-to-br from-midnight via-ember-deep to-ember text-white p-3 md:p-4 flex flex-col justify-between gap-2">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-ember/40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute right-8 top-8 h-40 w-40 rounded-full border border-white/10" />
          <div aria-hidden className="pointer-events-none absolute right-12 top-12 h-24 w-24 rounded-full border border-white/10" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
              <span className="h-1.5 w-1.5 rounded-full bg-ember-light" />
              {eyebrow}
            </span>
            <h2 className="mt-2 text-xl md:text-3xl font-black tracking-tight leading-tight text-white">{title}</h2>
            {subtitle && (
              <p className="mt-2 max-w-md text-sm text-white/85 leading-relaxed">{subtitle}</p>
            )}
            {stats && stats.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {stats.map(stat => (
                  <span
                    key={stat}
                    className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white"
                  >
                    {stat}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="relative z-10 mt-2 flex flex-wrap items-center gap-3">
            <Link
              href={href}
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-bold text-ember shadow-sm transition-colors duration-fast hover:bg-smoke-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            >
              {ctaText} →
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center gap-1 text-sm font-bold text-white underline underline-offset-4 hover:opacity-80"
            >
              {secondaryCtaText} ›
            </Link>
          </div>
        </div>

        <div className="bg-smoke-50 h-full">
          <div className="grid h-full grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 grid-auto-rows-1fr">
            {products.map((product, idx) => (
              <Link
                key={idx}
                href={product.href}
                className="group flex flex-col h-full rounded-lg border border-black/5 bg-white p-2 shadow-sm transition-all duration-normal hover:shadow-card-hover"
              >
                <div className="relative flex-1 w-full overflow-hidden rounded-md bg-smoke-100">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                  />
                </div>
                <div className="mt-1.5 flex flex-col gap-1 px-0.5">
                  <span className="text-[10px] md:text-[11px] leading-tight line-clamp-1 font-medium text-text-primary group-hover:underline">
                    {product.title}
                  </span>
                  {product.discountLabel && (
                    <span className="inline-flex w-fit items-center rounded-sm bg-deal px-1 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                      {product.discountLabel}
                    </span>
                  )}
                  {product.priceMinorUnits != null && product.currencyCode && (
                    <PriceDisplay
                      amountMinorUnits={product.priceMinorUnits}
                      currencyCode={product.currencyCode}
                      size="sm"
                      listMinorUnits={product.listPriceMinorUnits}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}