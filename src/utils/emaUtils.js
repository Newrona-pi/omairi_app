// 絵馬関連のユーティリティ関数

// 10文字ごとに改行を挿入する関数
export const insertLineBreaks = (text) => {
  if (!text) return '';
  // 改行文字を削除してから処理
  const cleanText = text.replace(/\n/g, '');
  const lines = [];
  for (let i = 0; i < cleanText.length; i += 10) {
    lines.push(cleanText.slice(i, i + 10));
  }
  return lines.join('\n');
};

// 文字数に応じてフォントサイズを返す関数（デスクトップ用）
export const getWishFontSize = (wish) => {
  if (!wish) return '1rem';
  if (wish.length <= 7) return '1.2rem';
  if (wish.length <= 16) return '1.1rem';
  if (wish.length <= 30) return '1rem';
  if (wish.length <= 40) return '0.9rem';
  return '0.8rem';
};

// 文字数に応じてフォントサイズを返す関数（スマホ用）
export const getWishFontSizeMobile = (wish) => {
  if (!wish) return '1rem';
  if (wish.length <= 8) return '1.1rem';
  if (wish.length <= 14) return '1rem';
  if (wish.length <= 20) return '0.9rem';
  if (wish.length <= 30) return '0.8rem';
  return '0.7rem';
};

// 文字数に応じて名前のフォントサイズを返す関数
export const getNameFontSize = (name) => {
  if (!name) return '1rem';
  if (name.length <= 4) return '1rem';
  if (name.length <= 5) return '0.9rem';
  if (name.length <= 6) return '0.8rem';
  if (name.length <= 7) return '0.7rem';
  if (name.length <= 8) return '0.6rem';
  return '0.5rem';
};

