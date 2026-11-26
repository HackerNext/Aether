/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#07090D',
        surface: '#10141D',
        surfaceHigh: '#161C29',
        recovery: '#10B981',
        strain: '#06B6D4',
        sleep: '#818CF8',
        caution: '#F59E0B',
        alert: '#F43F5E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glass: '0 12px 40px -12px rgba(0, 0, 0, 0.75)',
        emeraldGlow: '0 0 28px rgba(16, 185, 129, 0.28)',
        cyanGlow: '0 0 28px rgba(6, 182, 212, 0.28)',
        indigoGlow: '0 0 28px rgba(129, 140, 248, 0.28)',
      },
    },
  },
  plugins: [],
};
