/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f5f7f3',
        ink: '#17211c',
        muted: '#68746d',
        line: '#d9e1da',
        panel: '#ffffff',
        'panel-muted': '#f0f4f0',
        accent: '#126a5b',
        signal: '#be4524',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 33, 28, 0.05), 0 12px 32px rgba(23, 33, 28, 0.04)',
      },
    },
  },
  plugins: [],
}
