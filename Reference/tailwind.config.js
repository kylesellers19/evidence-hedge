/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#FAFAF8',
        linen: '#F5F5F0',
        border: '#E8E8E4',
        muted: '#6B6B6B',
        gold: {
          300: '#E8D5A3',
          400: '#D9C07B',
          500: '#C9A96E',
          600: '#B8955C',
        },
      },
      letterSpacing: {
        editorial: '0.15em',
        widest: '0.25em',
      },
      gridTemplateColumns: {
        masonry: 'repeat(2, 1fr)',
      },
    },
  },
  plugins: [],
}
