/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Primary orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Cultural theme colors with CSS custom properties
        'cultural-primary': 'var(--cultural-primary)',
        'cultural-secondary': 'var(--cultural-secondary)',
        'cultural-accent': 'var(--cultural-accent)',
        'cultural-background': 'var(--cultural-background)',
        'cultural-surface': 'var(--cultural-surface)',
        'cultural-card': 'var(--cultural-card)',
        'cultural-foreground': 'var(--cultural-foreground)',
        'cultural-muted': 'var(--cultural-muted)',
        'cultural-border': 'var(--cultural-border)',
        'cultural-ring': 'var(--cultural-ring)',
        'cultural-success': 'var(--cultural-success)',
        'cultural-warning': 'var(--cultural-warning)',
        'cultural-error': 'var(--cultural-error)',
        'cultural-info': 'var(--cultural-info)',
        // Legacy cultural theme colors for backward compatibility
        mediterranean: {
          primary: '#E67E22',
          secondary: '#27AE60',
          accent: '#3498DB',
        },
        asian: {
          primary: '#E74C3C',
          secondary: '#F39C12',
          accent: '#8E44AD',
        },
        latin: {
          primary: '#FF6B6B',
          secondary: '#4ECDC4',
          accent: '#45B7D1',
        },
        african: {
          primary: '#D35400',
          secondary: '#27AE60',
          accent: '#F1C40F',
        },
        'middle-eastern': {
          primary: '#8E44AD',
          secondary: '#E67E22',
          accent: '#16A085',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontFamily: {
        'sans': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'display': ['Fredoka', 'system-ui', 'sans-serif'],
        'heading': ['Fredoka', 'system-ui', 'sans-serif'],
      },
      animation: {
        'cultural-glow': 'cultural-glow 3s ease-in-out infinite',
        'celebrate': 'celebrate 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        'cultural-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 5px var(--cultural-primary))' },
          '50%': { filter: 'drop-shadow(0 0 15px var(--cultural-accent))' },
        },
        'celebrate': {
          '0%': { boxShadow: '0 0 20px var(--cultural-primary)' },
          '100%': { boxShadow: '0 0 40px var(--cultural-accent)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}