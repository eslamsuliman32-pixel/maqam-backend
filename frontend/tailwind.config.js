import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx,jsx,js}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        background: '#080A0F',
        surface: '#0D1017',
        'surface-2': '#111520',
        'surface-3': '#161b22',
        'text-primary': '#ffffff',
        'text-secondary': 'rgba(255,255,255,0.7)',
        'text-tertiary': 'rgba(255,255,255,0.4)',
        'brand-amber': '#f59e0b',
        'brand-amber-light': '#fbbf24',
        'brand-amber-dark': '#d97706',
        'brand-violet': '#8b5cf6',
        'brand-violet-light': '#a78bfa',
        'brand-violet-dark': '#7c3aed',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', 'monospace'],
        arabic: ['IBM Plex Arabic', 'Noto Sans Arabic', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', '1rem'],
        'sm': ['0.875rem', '1.25rem'],
        'base': ['1rem', '1.5rem'],
        'lg': ['1.125rem', '1.75rem'],
        'xl': ['1.25rem', '1.75rem'],
        '2xl': ['1.5rem', '2rem'],
        '3xl': ['1.875rem', '2.25rem'],
        '4xl': ['2.25rem', '2.5rem'],
      },
      spacing: {
        safe: 'var(--safe-area)',
      },
      boxShadow: {
        'glow-amber': '0 0 40px rgba(245,158,11,0.12)',
        'glow-violet': '0 0 40px rgba(139,92,246,0.12)',
        'glow-red': '0 0 40px rgba(239,68,68,0.12)',
        'glow-emerald': '0 0 40px rgba(16,185,129,0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
      },
    },
  },
  plugins: [],
  // نمط آمن للألوان
  safelist: [
    'bg-amber-500',
    'text-amber-500',
    'border-amber-500',
    'bg-violet-500',
    'text-violet-500',
    'border-violet-500',
    'bg-emerald-500',
    'text-emerald-500',
    'border-emerald-500',
  ],
};
