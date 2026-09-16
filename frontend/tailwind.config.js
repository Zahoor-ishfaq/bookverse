/** @type {import('tailwindcss').Config} */
// Custom tokens only. Default palette is intentionally replaced so nothing
// in the app can accidentally look like stock Tailwind.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#1A1A1A',
      canvas: { DEFAULT: '#FFFFFF', 50: '#FAFBFB', 100: '#F6F7F8', 200: '#ECEEF0', 300: '#E5E7EB', 400: '#CFD4D9' },
      ink: { DEFAULT: '#1C1C1C', 600: '#576066', 400: '#8B949A' },
      brand: { DEFAULT: '#1B6B4A', 700: '#155A3D', 50: '#E7F2EC' },
      gold: { DEFAULT: '#C8962B' },
      danger: { DEFAULT: '#B42318' },
    },
    fontFamily: {
      display: ['"Reddit Sans"', 'system-ui', 'sans-serif'],
      title: ['Lora', 'Georgia', 'serif'],
      quote: ['Lora', 'Georgia', 'serif'],
      body: ['"Reddit Sans"', 'system-ui', 'sans-serif'],
      mono: ['"Reddit Mono"', 'ui-monospace', 'monospace'],
    },
    extend: {
      borderRadius: { xl2: '1.25rem', xl3: '1.75rem', xl4: '2.25rem' },
      boxShadow: {
        paper: '0 1px 2px rgba(16,24,40,0.06), 0 4px 12px -6px rgba(16,24,40,0.10)',
        cover: '0 1px 2px rgba(16,24,40,0.12), 0 8px 20px -12px rgba(16,24,40,0.35)',
        lift: '0 12px 32px -12px rgba(16,24,40,0.25)',
      },
      maxWidth: { reader: '680px' },
      transitionTimingFunction: { soft: 'cubic-bezier(.22,.61,.36,1)' },
    },
  },
  plugins: [],
}
