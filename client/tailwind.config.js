/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0a',
        'bg-secondary': '#111111',
        'bg-tertiary': '#1a1a1a',
        border: '#2a2a2a',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0a0',
        'text-tertiary': '#555555',
        accent: '#ffffff',
        'accent-dim': '#333333',
        success: '#4ade80',
        danger: '#f87171',
        warning: '#fbbf24',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        heading: ['"Space Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
