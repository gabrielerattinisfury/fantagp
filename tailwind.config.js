/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        asfalto: {
          50: '#f5f6f7',
          100: '#e8eaec',
          200: '#cdd2d6',
          300: '#a3acb3',
          400: '#71808a',
          500: '#54616b',
          600: '#454f58',
          700: '#3a424a',
          800: '#262b30',
          850: '#1a1d21',
          900: '#121417',
          950: '#08090a',
        },
        bandiera: {
          rosso: '#E10600',
          giallo: '#FFD400',
          verde: '#00A859',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '24px 24px',
      },
    },
  },
  plugins: [],
};
