import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import type { HomeGridSection, HomePromoSection, HomeSectionItem } from '@/lib/home-content-build';

export function SeeMoreLink({
  href,
  children,
  dark,
  className,
}: {
  href: string;
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'text-xs font-bold hover:underline mt-2 inline-block',
        dark ? 'text-white underline' : 'text-ember hover:text-ember-dark',
        className,
      )}
    >
      {children} ›
    </Link>
  );
}

export function CategoryCard({ section }: { section: HomeGridSection }) {
  const dark = Boolean(section.cardBg?.includes('text-white'));
  return (
    <div
      className={cn(
        'rounded-xs shadow-md p-5 flex flex-col justify-between border border-neutral-200 transition-all hover:shadow-lg',
        section.cardBg || 'bg-white',
      )}
    >
      <div>
        <h3 className="text-lg md:text-xl font-bold tracking-tight mb-1">{section.title}</h3>
        {section.subtitle && (
          <p className="text-xs text-neutral-500 mb-3 line-clamp-2">{section.subtitle}</p>
        )}
        <div className="grid grid-cols-2 gap-3 mb-2">
          {section.tiles.map((tile, tileIdx) => (
            <Link key={tileIdx} href={tile.href} className="group block">
              <div
                className={cn(
                  'relative aspect-square w-full rounded-xs overflow-hidden mb-1 border border-neutral-200/60 shadow-xs',
                  tile.bgOverride || 'bg-neutral-100',
                )}
              >
                <Image
                  src={tile.image}
                  alt={tile.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              </div>
              <span className={cn('block text-xs font-medium group-hover:underline line-clamp-1', dark ? 'text-white/90' : 'text-text-primary')}>
                {tile.title}
              </span>
              {tile.priceMinorUnits != null && tile.currencyCode && (
                <span className="block mt-0.5">
                  <PriceDisplay
                    amountMinorUnits={tile.priceMinorUnits}
                    currencyCode={tile.currencyCode}
                    size="sm"
                    listMinorUnits={tile.listPriceMinorUnits}
                  />
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
      <SeeMoreLink href={section.linkHref ?? '/products'} dark={dark}>
        {section.linkText ?? 'See more'}
      </SeeMoreLink>
    </div>
  );
}

export function PromoSectionCard({ promo }: { promo: HomePromoSection }) {
  const dark = Boolean(promo.bgClass?.includes('text-white') || promo.bgClass?.includes('bg-neutral-900'));

  if (promo.wide) {
    return (
      <div className="relative overflow-hidden rounded-lg lg:col-span-4 border border-black/5 bg-surface shadow-card transition-shadow duration-normal hover:shadow-card-hover">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-ember/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-20 h-[26rem] w-[26rem] rounded-full bg-ember-pale blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-smoke-100/70" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-7 md:gap-10 p-6 md:p-10">
          <div className="flex-1 min-w-0">
            {promo.eyebrow && (
              <span className="inline-flex items-center gap-2 rounded-full border border-ember/15 bg-ember-pale px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-ember-dark">
                <span className="h-1.5 w-1.5 rounded-full bg-ember" />
                {promo.eyebrow}
              </span>
            )}
            <h3 className="mt-4 text-2xl md:text-3xl font-black tracking-tight text-text-primary">{promo.title}</h3>
            {promo.subtitle && (
              <p className="mt-2 max-w-md text-sm text-text-secondary leading-relaxed">{promo.subtitle}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {promo.priceMinorUnits != null && promo.currencyCode && (
                <PriceDisplay
                  amountMinorUnits={promo.priceMinorUnits}
                  currencyCode={promo.currencyCode}
                  size="lg"
                  listMinorUnits={promo.listPriceMinorUnits}
                />
              )}
              <Link
                href={promo.href}
                className="inline-flex items-center gap-2 rounded-md bg-action-primary px-5 py-2.5 text-sm font-bold text-action-primary-fg shadow-sm transition-colors duration-fast hover:bg-action-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2"
              >
                {promo.ctaText || 'Shop now'} →
              </Link>
            </div>
          </div>

          {promo.image && (
            <div className="relative shrink-0 w-full md:w-80 lg:w-96 h-56 md:h-72">
              <div aria-hidden className="absolute inset-0 scale-110 rounded-2xl bg-gradient-to-br from-ember/15 via-ember-pale to-transparent" />
              <div aria-hidden className="absolute inset-5 rounded-xl bg-white shadow-card-hover" />
              <div className="group relative h-full w-full overflow-hidden rounded-xl border border-black/5 bg-smoke-50 shadow-card">
                <Image
                  src={promo.image}
                  alt={promo.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  sizes="(max-width: 768px) 100vw, 384px"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg p-6 md:p-7 flex flex-col justify-between shadow-card transition-all duration-normal hover:-translate-y-0.5 hover:shadow-card-hover border',
        dark ? 'border-white/10' : 'border-neutral-200',
        promo.bgClass || 'bg-white',
      )}
    >
      {dark ? (
        <>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-ember/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 h-44 w-44 rounded-full border border-white/10" />
          <div aria-hidden className="pointer-events-none absolute -right-1 top-1/2 -translate-y-1/2 h-28 w-28 rounded-full border border-white/10" />
        </>
      ) : (
        <>
          <div aria-hidden className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 rounded-full bg-ember/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-ember-pale blur-2xl" />
        </>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {promo.eyebrow && (
          <span className={cn('inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]', dark ? 'opacity-80' : 'text-ember-dark')}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {promo.eyebrow}
          </span>
        )}
        <h3 className={cn('mt-3 text-xl md:text-2xl font-black tracking-tight', dark ? 'text-white' : 'text-neutral-900')}>{promo.title}</h3>
        {promo.subtitle && (
          <p className={cn('mt-2 text-xs md:text-sm leading-relaxed', dark ? 'text-white/85' : 'text-neutral-600')}>
            {promo.subtitle}
          </p>
        )}
        <div className="mt-auto pt-6">
          <Link
            href={promo.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold shadow-sm transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              dark
                ? 'bg-white text-neutral-900 hover:bg-smoke-100 focus-visible:ring-white'
                : 'bg-action-primary text-action-primary-fg hover:bg-action-primary-hover focus-visible:ring-ember',
            )}
          >
            {promo.ctaText || 'Shop now'} →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CategoryRowGrid({ items }: { items: HomeSectionItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map((item, itemIndex) =>
        item.type === 'promo' ? (
          <PromoSectionCard key={itemIndex} promo={item} />
        ) : (
          <CategoryCard key={itemIndex} section={item} />
        ),
      )}
    </div>
  );
}