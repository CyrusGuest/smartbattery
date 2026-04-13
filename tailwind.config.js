/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#07080F',
          card: '#0C0E1A',
          cardalt: '#131628',
          border: '#1A1D2E',
          cyan: '#00D4FF',
          purple: '#7B61FF',
          fire: '#FF6B35',
          text: '#C8D3F5',
          muted: '#3D4266',
          dim: '#2A2D42',
          green: '#00FF94',
          red: '#FF3366',
        }
      }
    }
  },
  plugins: [],
}
