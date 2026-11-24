/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1C2541',
          soft: '#3B4869',
          mute: '#6B7690',
        },
        gold: {
          DEFAULT: '#B9962F',
          soft: '#F6EED9',
          line: '#E7D8AE',
        },
        paper: {
          DEFAULT: '#FAF7F1',
          deep: '#F2ECE1',
        },
        line: {
          DEFAULT: '#E7DFD1',
        },
        rose: '#B4513E',
      },
      fontFamily: {
        sans: [
          'NanumSquareRound',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Malgun Gothic"',
          '"Apple SD Gothic Neo"',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 10px 30px -18px rgba(28, 37, 65, 0.45)',
        card: '0 4px 14px -8px rgba(28, 37, 65, 0.28)',
        sheet: '0 -10px 30px -18px rgba(28, 37, 65, 0.45)',
      },
      keyframes: {
        fadein: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.94)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideup: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        fadein: 'fadein 0.22s ease-out',
        pop: 'pop 0.16s ease-out',
        slideup: 'slideup 0.22s ease-out',
      },
    },
  },
  plugins: [],
}
