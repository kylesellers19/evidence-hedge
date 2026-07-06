/** @type {import('tailwindcss').Config} */
// Tokens flow from ONE source: the CSS variables in src/index.css :root.
// Tailwind's font + accent utilities consume those vars so every screen —
// Tailwind-styled (ResultsPage) or plain-CSS (landing/branch) — shares them.
// Register: true white, near-black ink, hairline borders, single navy accent.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--eh-serif)'],
        sans: ['var(--eh-sans)'],
        mono: ['var(--eh-mono)'],
      },
      colors: {
        paper: 'var(--eh-paper)',
        ink: 'var(--eh-ink)',
        navy: 'var(--eh-navy)',
        // Hairline + neutral tokens sourced from the same :root block.
        border: 'var(--eh-hairline)',
        linen: '#F5F5F0',
        muted: '#6B6B6B',
      },
      letterSpacing: {
        editorial: '0.15em',
        widest: '0.25em',
      },
      maxWidth: {
        brief: '46rem', // one-page editorial reading column
      },
    },
  },
  plugins: [],
}
