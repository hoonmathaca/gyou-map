/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 깊은 올리브 잉크 — 본문 글자·버튼 바탕
        ink: {
          DEFAULT: '#26331F',
          soft: '#47533D',
          mute: '#7C8674',
        },
        // 주 색 — 스팟맵풍 올리브 그린
        gold: {
          DEFAULT: '#6F8B3E',
          deep: '#5A7231',
          soft: '#EDF1DF',
          line: '#CCD8B2',
        },
        paper: {
          DEFAULT: '#FAF8F1',
          deep: '#F1EEE1',
        },
        line: {
          DEFAULT: '#E3E0D0',
        },
        rose: '#BF4A33',
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
        soft: '0 10px 30px -18px rgba(38, 51, 31, 0.5)',
        card: '0 4px 14px -8px rgba(38, 51, 31, 0.3)',
        sheet: '0 -10px 30px -18px rgba(38, 51, 31, 0.45)',
        float: '0 6px 18px -8px rgba(38, 51, 31, 0.45)',
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
        slideup: 'slideup 0.24s cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
