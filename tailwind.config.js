/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'pixel': ['Press Start 2P', 'cursive'],
        'custom': ['Press Start 2P', 'cursive'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      animation: {
        'brightpulse': 'brightpulse 1.5s ease-in-out infinite',
        'marquee': 'marquee 10s linear infinite',
      },
      keyframes: {
        brightpulse: {
          '0%, 100%': { filter: 'brightness(100%)' },
          '50%': { filter: 'brightness(150%)' },
        },
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
}
