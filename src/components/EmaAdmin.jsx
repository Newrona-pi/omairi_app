// EmaAdmin component (開発中)
// このファイルはビルドエラーを防ぐためのダミーファイルです
// 実際の実装は後で追加されます

import React from 'react';

export const EmaAdmin = ({ onBack }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 text-white">
      <div>
        <h1 className="text-2xl mb-4">管理画面</h1>
        <p className="mb-4">管理画面は現在開発中です</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            戻る
          </button>
        )}
      </div>
    </div>
  );
};
