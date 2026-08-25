import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef7ee', 100: '#fdedd3', 200: '#f9d7a5', 300: '#f5b96d',
          400: '#f09332', 500: '#ec7a0d', 600: '#dd5f03', 700: '#b74606',
          800: '#92370c', 900: '#762f0d', 950: '#401505',
        },
        surface: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
      },
    },
  },
  plugins: [],
};

export default config;
