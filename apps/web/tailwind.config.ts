import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D61F4A',
          foreground: '#FFFFFF',
          soft: '#FFF0F3',
        },
        secondary: {
          DEFAULT: '#1B3A5F',
          foreground: '#FFFFFF',
          soft: '#E8EEF5',
        },
        background: '#F1F3F6',
        surface: '#FFFFFF',
        foreground: '#141820',
        muted: {
          DEFAULT: '#E4E7EC',
          foreground: '#5B6470',
        },
        success: '#15803D',
        border: '#D0D5DD',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Figtree', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Syne', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        button: '10px',
      },
      boxShadow: {
        soft: '0 1px 0 rgba(20,24,32,0.04), 0 8px 24px -18px rgba(20,24,32,0.22)',
        lift: '0 14px 32px -18px rgba(20,24,32,0.38)',
        glow: '0 10px 28px -12px rgba(214,31,74,0.35)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-top': 'env(safe-area-inset-top, 0px)',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'dialog-overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'dialog-overlay-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'dialog-content-in': {
          from: {
            opacity: '0',
            transform: 'translate(-50%, calc(-50% + 18px)) scale(0.94)',
          },
          to: {
            opacity: '1',
            transform: 'translate(-50%, -50%) scale(1)',
          },
        },
        'dialog-content-out': {
          from: {
            opacity: '1',
            transform: 'translate(-50%, -50%) scale(1)',
          },
          to: {
            opacity: '0',
            transform: 'translate(-50%, calc(-50% + 10px)) scale(0.97)',
          },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'slow-zoom': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.06)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.72' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        'splash-mark': {
          '0%': { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'splash-rise': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-up': 'fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'dialog-overlay-in': 'dialog-overlay-in 0.25s ease-out both',
        'dialog-overlay-out': 'dialog-overlay-out 0.2s ease-in both',
        'dialog-content-in':
          'dialog-content-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'dialog-content-out':
          'dialog-content-out 0.2s cubic-bezier(0.4, 0, 1, 1) both',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'slow-zoom': 'slow-zoom 18s ease-out forwards',
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
        shake: 'shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'splash-mark': 'splash-mark 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'splash-rise': 'splash-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
