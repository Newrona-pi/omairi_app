// キャラクター関連のユーティリティ関数

// CSVパース処理を改善（カンマ区切りを正しく処理）
export const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

// キャラクターをフィルタリングする関数
export const filterCharacters = (characters, searchTerm) => {
  return characters.filter(character =>
    (character.name && character.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (character.description && character.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
};

