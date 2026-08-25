export const colors = {
  brand: {
    charcoal: { DEFAULT: '#1c1c1c', light: '#3d454a', mid: '#5a6268', soft: '#8c9296', line: '#141414' },
    ember: { DEFAULT: '#4c12a1', dark: '#400e8a', deep: '#320b6e', light: '#7a4bc9', pale: '#f2ebfb' },
    tealink: { DEFAULT: '#4c12a1', hover: '#380d80' },
  },
  smoke: {
    25: '#fafafa', 50: '#f7f7f7', 100: '#f2f2f2', 150: '#e0e0e0',
    200: '#d4d4d4', 300: '#b8b8b8', 400: '#949494', 500: '#717171',
    600: '#525252', 700: '#3d3d3d', 800: '#292929', 900: '#141414', 950: '#0a0a0a',
  },
  footer: '#3d454a',
} as const;

export const semantic = {
  // Surface hierarchy
  surfacePage:    '#f3f3f3',   // Currys grey canvas
  surface:        '#FFFFFF',
  surfaceRaised:  '#FFFFFF',
  surfaceSunken:  '#EDEDED',
  surfaceOverlay: 'rgba(28,28,28,0.55)',

  // Borders
  border:         '#e0e0e0',
  borderStrong:   '#c9c9c9',
  borderFocus:    '#4C12A1',

  // Text
  textPrimary:    '#1C1C1C',
  textSecondary:  '#4d5154',
  textTertiary:   '#76797c',
  textDisabled:   '#a9adaf',
  textInverse:    '#FFFFFF',
  textLink:       '#4C12A1',
  textLinkHover:  '#380D80',

  // Actions
  actionPrimary:        '#4C12A1',
  actionPrimaryHover:   '#400E8A',
  actionPrimaryActive:  '#320B6E',
  actionPrimaryFg:      '#FFFFFF',
  actionSecondary:      '#1C1C1C',
  actionSecondaryHover: '#333333',
  actionDestructive:    '#C41919',
  actionSuccess:        '#007B4B',

  // Feedback
  feedbackSuccess:     '#007B4B',
  feedbackSuccessBg:   '#E8F6F0',
  feedbackWarning:     '#B45309',
  feedbackWarningBg:   '#FEF9EC',
  feedbackDanger:      '#C41919',
  feedbackDangerBg:    '#FDF0F0',
  feedbackInfo:        '#1954B8',
  feedbackInfoBg:      '#EFF4FE',

  // Rating
  ratingStar:     '#4C12A1',
} as const;

export const typography = {
  display2xl: '72px/78px -0.04em 800',
  displayXl: '56px/62px -0.03em 700',
  displayLg: '44px/50px -0.025em 700',
  displayMd: '34px/40px -0.02em 600',
  displaySm: '26px/32px -0.015em 600',
  headingXl: '22px/28px 700',
  headingLg: '18px/24px 700',
  headingMd: '16px/22px 600',
  labelLg: '500 0.875rem/1.25rem 0.01em', // uppercase typically
  labelMd: '500 0.8125rem/1.125rem',
  bodyLg: '400 1rem/1.625rem',
  bodyMd: '400 0.9375rem/1.5rem',
  bodySm: '400 0.875rem/1.375rem',
  caption: '400 0.75rem/1.125rem',
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const layout = {
  baseUnit: 8,
  pageMaxWidth: '1600px',
  contentMaxWidth: '1320px',
  narrowMaxWidth: '780px',
  gutters: { mobile: 16, tablet: 32, desktop: 56 },
  columns: {
    mobile: 4, tablet: 8, desktop: 12
  }
} as const;

export const shadows = {
  xs:        '0 1px 2px 0 rgba(28,28,28,0.04)',
  sm:        '0 1px 3px 0 rgba(28,28,28,0.06)',
  md:        '0 2px 6px 0 rgba(28,28,28,0.08)',
  lg:        '0 4px 12px 0 rgba(28,28,28,0.10)',
  xl:        '0 8px 24px 0 rgba(28,28,28,0.12)',
  '2xl':     '0 16px 48px 0 rgba(28,28,28,0.16)',
  focus:     '0 0 0 3px rgba(76,18,161,0.30)',
  card:      '0 1px 2px 0 rgba(28,28,28,0.04)',
  cardHover: '0 2px 6px 0 rgba(28,28,28,0.10)',
  sticky:    '0 2px 8px 0 rgba(28,28,28,0.08)',
} as const;

export const motion = {
  durationInstant: '50ms',
  durationFast: '100ms',
  durationNormal: '200ms',
  durationSlow: '350ms',
  durationSlower: '500ms',
  durationSlowest: '700ms',
  easeOut: 'cubic-bezier(0.00, 0.00, 0.20, 1.00)',
  easeIn: 'cubic-bezier(0.40, 0.00, 1.00, 1.00)',
  easeInOut: 'cubic-bezier(0.40, 0.00, 0.20, 1.00)',
  easeSpring: 'cubic-bezier(0.16, 1.00, 0.30, 1.00)',
  easeBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1.00)',
  easeSharp: 'cubic-bezier(0.20, 0.00, 0.00, 1.00)',
} as const;

export const radii = {
  none: '0',
  xs:   '4px',
  sm:   '4px',
  md:   '4px',
  lg:   '4px',
  xl:   '6px',
  '2xl':'8px',
  '3xl':'8px',
  pill: '9999px',
} as const;

export const zIndexLayers = {
  header: 40,
  tooltip: 50,
  drawer: 60,
  modal: 70,
  toast: 80,
} as const;
