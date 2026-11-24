/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 깊은 남색 잉크 — 본문 글자·버튼 바탕 (훈수학 텍스트 남색 계열)
        ink: {
          DEFAULT: '#16284C',
          soft: '#41527A',
          mute: '#78859E',
        },
        // 주 색 — 훈수학 시그니처 남색·파랑 (선오공: navy #12296B / blue #1D4A9B)
        brand: {
          DEFAULT: '#1D4A9B',
          deep: '#12296B',
          soft: '#EEF3FD',
          line: '#C9D8F2',
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
        soft: '0 10px 30px -18px rgba(18, 41, 107, 0.5)',
        card: '0 4px 14px -8px rgba(18, 41, 107, 0.3)',
        sheet: '0 -10px 30px -18px rgba(18, 41, 107, 0.45)',
        float: '0 6px 18px -8px rgba(18, 41, 107, 0.45)',
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
