'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRegion } from '../providers/RegionContext';
import { useCart } from '../providers/CartContext';
import { useWishlist } from '../providers/WishlistContext';
import { REGION_META, regionUrl } from '@/lib/regions';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';
import { SearchBar } from '../search/SearchBar';
import { CategoryMegaMenu, type MegaMenuCategory } from '../navigation/CategoryMegaMenu';
import { CartDrawer } from '../commerce/CartDrawer';
import { Drawer } from '../ui/Drawer';
import { AnnouncementBar } from './AnnouncementBar';
import { IconButton } from '../ui/Button';
import { CounterBadge } from '../ui/Badge';
import {
  HeartIcon,
  ChevronDown,
  UserIcon,
  PinIcon,
  CartIcon,
  MenuIcon,
} from '../icons';

const CATEGORY_LINKS = [
  ['Electronics', 'electronics'],
  ['Computers', 'computers'],
  ['Home & Kitchen', 'home'],
  ['Fashion', 'fashion'],
  ['Beauty', 'beauty'],
  ['Sports', 'sports'],
  ['Books', 'books'],
] as const;

const MEGA_MENU_CATEGORIES: MegaMenuCategory[] = CATEGORY_LINKS.map(([name, slug]) => ({
  name,
  slug,
  children: [],
}));

export interface HeaderProps {
  announcementMessages: string[];
}

const HEADER_TRIGGER =
  'flex items-center gap-1 px-2.5 py-1.5 border border-transparent hover:border-border-strong rounded-xs leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary text-left';
const HEADER_TRIGGER_LABEL_WRAPPER = 'min-w-0';
const HEADER_TRIGGER_TOP_LINE = 'block text-xs text-text-tertiary truncate';
const HEADER_TRIGGER_BOTTOM_LINE =
  'inline-flex items-center gap-0.5 text-xs font-bold text-text-primary';

function useOutsideClick<T extends HTMLElement>(
  handler: (e: MouseEvent) => void,
  enabled = true
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!enabled) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler(e);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [handler, enabled]);
  return ref;
}

function CategoryMegaMenuTrigger({
  language,
  categories,
}: {
  language: string;
  categories: MegaMenuCategory[];
}) {
  return <CategoryMegaMenu categories={categories} language={language} />;
}

function RegionDeliverTo({
  currentKey,
  language,
}: {
  currentKey: string;
  language: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));
  const region = REGION_META.find(r => r.key === currentKey) ?? REGION_META[0];

  return (
    <div ref={ref} className="relative hidden lg:block shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={HEADER_TRIGGER}
      >
        <PinIcon className="w-5 h-5 shrink-0 text-text-secondary" />
        <span className={HEADER_TRIGGER_LABEL_WRAPPER}>
          <span className={HEADER_TRIGGER_TOP_LINE}>{t(language, 'deliverTo')}</span>
          <span className={HEADER_TRIGGER_BOTTOM_LINE}>
            <span className="shrink-0">{region.flag}</span>
            <span className="truncate">{region.name}</span>
            <ChevronDown className="w-3 h-3 shrink-0 opacity-80" />
          </span>
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Choose your country or region"
          className="absolute rtl:right-0 ltr:left-0 top-full mt-1 w-[30rem] max-h-[70vh] overflow-y-auto bg-surface rounded-lg shadow-xl p-4 z-[var(--z-tooltip)] animate-popover-in text-text-primary"
        >
          <h3 className="text-sm font-bold mb-1">Choose your country or region</h3>
          <p className="text-xs text-text-secondary mb-3">
            Shopping on <strong>{currentKey.toLowerCase()}.Storegrill.net</strong> — local
            currency, payments and delivery.
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-2">
            {REGION_META.map(r => (
              <li key={r.key}>
                <a
                  href={regionUrl(r.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-xs hover:bg-surface-sunset transition-colors',
                    r.key === currentKey && 'font-bold bg-feedback-info-bg'
                  )}
                >
                  <span aria-hidden="true">{r.flag}</span>
                  <span className="truncate">{r.name}</span>
                  <span className="ml-auto text-2xs text-text-tertiary">{r.currency}</span>
                </a>
              </li>
            ))}
          </ul>
          <a
            href={regionUrl(currentKey, '/regions')}
            className="btn btn-outline btn-sm mt-3 w-full"
          >
            View all regions →
          </a>
        </div>
      )}
    </div>
  );
}

function LanguageMenu({
  currentLanguage,
  languages,
  onSelect,
}: {
  currentLanguage: string;
  languages: Array<{ code: string; nativeName: string }>;
  onSelect: (code: string) => void;
}) {
  if (languages.length <= 1) return null;

  return (
    <div className="relative hidden md:block shrink-0">
      <select
        aria-label="Switch language"
        value={currentLanguage}
        onChange={e => onSelect(e.target.value)}
        className="bg-transparent border border-transparent hover:border-border-strong rounded-sm text-xs font-bold uppercase cursor-pointer py-1.5 pl-1.5 pr-1 appearance-none outline-none [&>option]:text-text-primary"
      >
        {languages.map(l => (
          <option key={l.code} value={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}

function AccountMenu({ language }: { language: string }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));

  return (
    <div ref={ref} className="hidden lg:block relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={HEADER_TRIGGER}
      >
        <UserIcon className="w-5 h-5 shrink-0 text-text-secondary" />
        <span className={HEADER_TRIGGER_LABEL_WRAPPER}>
          <span className={HEADER_TRIGGER_TOP_LINE}>
            {t(language, 'hello')}, {t(language, 'signIn').toLowerCase()}
          </span>
          <span className={HEADER_TRIGGER_BOTTOM_LINE}>
            <span className="truncate">{t(language, 'account')}</span>
            <ChevronDown className="w-3 h-3 shrink-0 opacity-80" />
          </span>
        </span>
      </button>
      {open && (
        <div className="absolute rtl:left-0 ltr:right-0 top-full mt-1 w-64 bg-surface rounded-lg shadow-xl border border-subtle py-3 px-4 animate-popover-in text-text-primary z-[var(--z-tooltip)]">
          <Link
            href="/auth/signin"
            onClick={() => setOpen(false)}
            className="btn btn-primary w-full mb-3"
          >
            {t(language, 'signInButton')}
          </Link>
          <p className="text-xs text-center mb-2">
            New customer?{' '}
            <Link
              href="/auth/signup"
              onClick={() => setOpen(false)}
              className="text-text-link hover:text-text-link-hover hover:underline"
            >
              {t(language, 'createAccount')}
            </Link>
          </p>
          <hr className="my-3 border-subtle" />
          <div className="grid gap-1.5 text-xs">
            <Link
              className="hover:underline"
              href="/account"
              onClick={() => setOpen(false)}
            >
              {t(language, 'account')}
            </Link>
            <Link
              className="hover:underline"
              href="/account/orders"
              onClick={() => setOpen(false)}
            >
              Your Orders
            </Link>
            <Link
              className="hover:underline"
              href="/account/wishlist"
              onClick={() => setOpen(false)}
            >
              Your Wishlist
            </Link>
            <Link
              className="hover:underline"
              href="/regions"
              onClick={() => setOpen(false)}
            >
              {t(language, 'changeRegion')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileMenu({
  open,
  onClose,
  currentRegion,
  language,
  onLanguage,
}: {
  open: boolean;
  onClose: () => void;
  currentRegion: string;
  language: string;
  onLanguage: (code: string) => void;
}) {
  const regionMeta = REGION_META.find(r => r.key === currentRegion) ?? REGION_META[0];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      title="Browse Storegrill"
      className="!max-w-full sm:!max-w-full w-full"
    >
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="p-4 bg-surface-raised text-text-primary flex items-center justify-between sticky top-0 z-10 border-b border-border">
          <p className="text-sm font-bold">
            {t(language, 'hello')}, {t(language, 'signIn').toLowerCase()}
          </p>
          <Link href="/auth/signin" onClick={onClose} className="btn btn-primary btn-xs">
            Sign In
          </Link>
        </div>

        <section className="py-3" aria-label="Shop by department">
          <h3 className="px-4 py-2 text-base font-bold">Shop by Department</h3>
          {CATEGORY_LINKS.map(([label, slug]) => (
            <Link
              key={slug}
              href={`/products?category=${slug}`}
              onClick={onClose}
              className="block px-4 py-2.5 text-sm hover:bg-surface-sunset"
            >
              {label}
            </Link>
          ))}
        </section>

        <hr className="border-border" />

        <section className="py-3" aria-label="Programs">
          <h3 className="px-4 py-2 text-base font-bold">Programs</h3>
          <Link
            href="/deals"
            onClick={onClose}
            className="block px-4 py-2.5 text-sm hover:bg-surface-sunset"
          >
            Today&apos;s Deal
          </Link>
          <Link
            href="/vendors"
            onClick={onClose}
            className="block px-4 py-2.5 text-sm hover:bg-surface-sunset"
          >
            Vendors
          </Link>
        </section>

        <hr className="border-border" />

        <section className="py-3" aria-label="Help & Settings">
          <h3 className="px-4 py-2 text-base font-bold">Help & Settings</h3>
          {regionMeta.languages.length > 1 && (
            <div className="px-4 py-2">
              <label htmlFor="mobile-lang" className="block text-xs text-text-secondary mb-1">
                Language
              </label>
              <select
                id="mobile-lang"
                value={language}
                onChange={e => onLanguage(e.target.value)}
                className="input h-9 text-xs"
              >
                {regionMeta.languages.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <details className="px-4 py-2">
            <summary className="cursor-pointer text-sm font-medium select-none">
              Change region ({regionMeta.flag} {regionMeta.name})
            </summary>
            <ul className="mt-2 max-h-64 overflow-y-auto">
              {REGION_META.map(r => (
                <li key={r.key}>
                  <a
                    href={regionUrl(r.key)}
                    className={cn(
                      'flex items-center gap-2 py-1.5 text-xs hover:text-text-link',
                      r.key === currentRegion && 'font-bold'
                    )}
                  >
                    {r.flag} {r.name}
                    <span className="ml-auto text-2xs text-text-tertiary">{r.currency}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </section>
      </div>
    </Drawer>
  );
}

function Header({ announcementMessages }: HeaderProps) {
  const { regionKey, language, setLanguage } = useRegion();
  const cart = useCart();
  const wishlist = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <AnnouncementBar messages={announcementMessages} />

      <header
        className="sticky top-0 z-[var(--z-header)] bg-surface border-b border-border shadow-[0_1px_0_var(--color-border)]"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="container-site">
          <div className="flex items-center gap-2 md:gap-4 lg:gap-8 h-[64px] md:h-[72px] lg:h-[80px]">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="md:hidden p-2 -ml-2 text-text-primary hover:text-action-primary transition-colors"
            >
              <MenuIcon className="w-6 h-6" />
            </button>

            <Link
              href="/"
              aria-label="Storegrill home"
              className="shrink-0 flex items-center py-2 -my-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Storegrill" className="h-7 md:h-9 w-auto" />
            </Link>

            {/* Prominent Desktop Search ────────────────────────────────── */}
            <div className="hidden md:block flex-1 max-w-2xl ml-4 min-w-0">
              <SearchBar regionKey={regionKey} />
            </div>

            <RegionDeliverTo currentKey={regionKey} language={language} />

            <AccountMenu language={language} />

            <IconButton
              variant="header-action"
              size="sm"
              label="Wishlist"
              href="/account/wishlist"
              icon={<HeartIcon className="w-6 h-6 text-text-primary" />}
              badge={
                <CounterBadge
                  count={wishlist.items.length}
                  aria-label={`Wishlist has ${wishlist.items.length} items`}
                />
              }
              aria-label={`Open wishlist, ${wishlist.items.length} items`}
            />

            <IconButton
              variant="header-action"
              size="sm"
              label="Basket"
              icon={<CartIcon className="w-6 h-6 text-text-primary" />}
              badge={
                <CounterBadge
                  count={cart.count}
                  aria-label={`Basket has ${cart.count} items`}
                />
              }
              onClick={() => setCartOpen(true)}
              data-testid="cart-button"
              aria-label={`Open cart, ${cart.count} items`}
            />
          </div>

          {/* Mobile search - shown in drawer */}
          <div className="md:hidden pb-3">
            <SearchBar regionKey={regionKey} />
          </div>
        </div>

        <nav
          aria-label="Categories"
          className="bg-surface-page border-b border-border hidden lg:block"
        >
          <div className="container-site flex items-center gap-8 h-11 overflow-x-auto scrollbar-none text-base font-bold text-text-primary">
            <CategoryMegaMenuTrigger language={language} categories={MEGA_MENU_CATEGORIES} />
            {CATEGORY_LINKS.map(([label, slug]) => (
              <Link
                key={slug}
                href={`/products?category=${slug}`}
                className="hover:underline hover:text-action-primary transition-colors"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/deals"
              className="ml-auto text-action-primary hover:underline transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              Today&apos;s Deal
            </Link>
          </div>
        </nav>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        currentRegion={regionKey}
        language={language}
        onLanguage={setLanguage}
      />
    </>
  );
}

export { Header };
export default Header;
