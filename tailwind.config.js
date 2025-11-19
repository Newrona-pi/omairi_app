/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        handwriting: ["Klee One", "Hina Mincho", "Noto Sans JP", "cursive"], // 絵馬のテキスト用フォント
      },
    },
  },
  plugins: [],
}


