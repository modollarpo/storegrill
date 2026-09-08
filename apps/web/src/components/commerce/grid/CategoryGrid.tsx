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
  if (promo.wide) {
    return (
      <div
        className={cn(
          'rounded-xs shadow-md p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-5 border border-neutral-200 transition-all hover:shadow-lg lg:col-span-4',
          promo.bgClass || 'bg-gradient-to-br from-smoke-50 to-neutral-100',
        )}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-1">{promo.title}</h3>
          {promo.subtitle && <p className="text-xs md:text-sm opacity-90 mb-3">{promo.subtitle}</p>}
          {promo.priceMinorUnits != null && promo.currencyCode && (
            <div className="mb-3">
              <PriceDisplay
                amountMinorUnits={promo.priceMinorUnits}
                currencyCode={promo.currencyCode}
                size="lg"
                listMinorUnits={promo.listPriceMinorUnits}
              />
            </div>
          )}
          <SeeMoreLink href={promo.href}>{promo.ctaText || 'Shop now'}</SeeMoreLink>
        </div>
        {promo.image && (
          <div className="relative w-48 h-48 sm:w-60 sm:h-60 shrink-0 rounded-xs overflow-hidden bg-neutral-100">
            <Image src={promo.image} alt={promo.title} fill className="object-cover" sizes="(max-width: 640px) 192px, 240px" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xs shadow-md p-5 flex flex-col justify-between border border-neutral-200 transition-all hover:shadow-lg',
        promo.bgClass || 'bg-white',
      )}
    >
      <div>
        <h3 className="text-lg md:text-xl font-bold tracking-tight mb-1">{promo.title}</h3>
        {promo.subtitle && <p className="text-xs opacity-90 mb-3">{promo.subtitle}</p>}
      </div>
      {promo.image && (
        <div className="relative w-full h-48 my-3 rounded-xs overflow-hidden bg-neutral-100">
          <Image src={promo.image} alt={promo.title} fill className="object-cover" />
        </div>
      )}
      <SeeMoreLink href={promo.href} dark={promo.bgClass?.includes('text-white') || promo.bgClass?.includes('bg-neutral-900')}>
        {promo.ctaText || 'Shop now'}
      </SeeMoreLink>
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