import type { Config } from 'tailwindcss';
import { colors, shadows, radii, typography, layout, motion } from './src/design-system/tokens';

const SYSTEM_SANS = [
  'var(--font-sans)',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
];

const kebab = (obj: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`), value]),
  );

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: SYSTEM_SANS,
        display: SYSTEM_SANS,
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        charcoal: colors.brand.charcoal,
        ember: colors.brand.ember,
        tealink: colors.brand.tealink,
        smoke: colors.smoke,
        footerdark: colors.footer,
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          overlay: 'var(--color-surface-overlay)',
          sunken: 'var(--color-surface-sunken)',
          page: 'var(--color-surface-page)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
          inverse: 'var(--color-text-inverse)',
          link: 'var(--color-text-link)',
          'link-hover': 'var(--color-text-link-hover)',
        },
        action: {
          primary: 'var(--color-action-primary)',
          'primary-hover': 'var(--color-action-primary-hover)',
          'primary-active': 'var(--color-action-primary-active)',
          'primary-fg': 'var(--color-action-primary-fg)',
          secondary: 'var(--color-action-secondary)',
          'secondary-hover': 'var(--color-action-secondary-hover)',
          destructive: 'var(--color-action-destructive)',
          success: 'var(--color-action-success)',
        },
        feedback: {
          success: 'var(--color-feedback-success)',
          'success-bg': 'var(--color-feedback-success-bg)',
          warning: 'var(--color-feedback-warning)',
          'warning-bg': 'var(--color-feedback-warning-bg)',
          danger: 'var(--color-feedback-danger)',
          'danger-bg': 'var(--color-feedback-danger-bg)',
          info: 'var(--color-feedback-info)',
          'info-bg': 'var(--color-feedback-info-bg)',
        },
      },
      fontSize: kebab(typography),
      maxWidth: {
        site: layout.pageMaxWidth,
        content: layout.contentMaxWidth,
        narrow: layout.narrowMaxWidth,
      },
      boxShadow: kebab(shadows),
      borderRadius: radii,
      transitionDuration: {
        instant: '50ms',
        fast: '100ms',
        normal: '200ms',
        slow: '350ms',
        slower: '500ms',
        slowest: '700ms',
      },
      transitionTimingFunction: {
        default: 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.40, 0, 1, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.40, 0, 0.2, 1)',
        spring: motion.easeSpring,
        bounce: motion.easeBounce,
        sharp: motion.easeSharp,
      },
      backgroundImage: {
        shimmer: 'linear-gradient(90deg, #ebebeb 25%, #f5f5f5 50%, #ebebeb 75%)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in-left': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
        'slide-in-right': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'slide-up': { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        'toast-in': {
          '0%': { transform: 'translateY(16px) scale(0.98)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'popover-in': {
          '0%': { opacity: '0', transform: 'translateY(-6px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'count-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in var(--duration-normal) var(--ease-default)',
        'slide-in-left': 'slide-in-left var(--duration-slow) var(--ease-default)',
        'slide-in-right': 'slide-in-right var(--duration-slow) var(--ease-default)',
        'slide-up': 'slide-up var(--duration-normal) var(--ease-default)',
        shimmer: 'shimmer 1.6s linear infinite',
        'toast-in': 'toast-in var(--duration-normal) var(--ease-bounce)',
        'popover-in': 'popover-in var(--duration-fast) var(--ease-spring)',
        'count-pop': 'count-pop var(--duration-normal) var(--ease-bounce)',
      },
    },
  },
  plugins: [],
};

export default config;
