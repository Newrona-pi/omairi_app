import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { filterCharacters } from '../utils/characterUtils';

const INITIAL_DISPLAY_COUNT = 20;
const LOAD_MORE_COUNT = 20;

export const CharacterSelection = ({ 
  characters, 
  loading, 
  searchTerm, 
  setSearchTerm, 
  handleCharacterSelect 
}) => {
  const filteredCharacters = filterCharacters(characters, searchTerm);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  // 検索語が変更されたら表示数をリセット
  useEffect(() => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  }, [searchTerm]);

  const displayedCharacters = filteredCharacters.slice(0, displayCount);
  const hasMore = filteredCharacters.length > displayCount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 w-screen h-screen overflow-hidden"
    >
      <video
        src="assets/20251105_1612_01k99dqb5jfeyss6nv2m5s4kbj.mp4"
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
        style={{ filter: 'blur(8px)' }}
      />
      <div className="absolute inset-0 p-4 sm:p-6 md:p-8 overflow-y-auto">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-white/80 mb-4 sm:mb-6 md:mb-8 drop-shadow-lg">
          推しを選んでください
        </h1>
        {/* 検索ボックス */}
        <div className="max-w-md mx-auto mb-4 sm:mb-6 md:mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="推しの名前で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white rounded-none shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-white text-sm mt-2 text-center">
              {filteredCharacters.length}件の推し候補が見つかりました
            </p>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-white text-xl">読み込み中...</div>
          </div>
        ) : (
          <>
            {filteredCharacters.length === 0 ? (
              <div className="text-center text-white">
                <div className="text-2xl mb-4">🐎🐎🐎</div>
                <p className="text-lg mb-2">該当する推し候補が見つかりませんでした</p>
                <p className="text-sm opacity-80">検索キーワードを変更してお試しください</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 max-w-6xl mx-auto">
                  {displayedCharacters.map((character) => (
                    <div
                      key={character.id}
                      className="character-card bg-white/80 rounded-lg shadow-lg p-2 sm:p-3 md:p-4 cursor-pointer flex flex-col items-center aspect-[3/4] h-48 sm:h-56 md:h-64 w-32 sm:w-36 md:w-44"
                      onClick={() => handleCharacterSelect(character)}
                    >
                      <div className="character-card-content w-full h-full flex flex-col">
                        <div className="w-full h-4/5 flex items-center justify-center mb-3">
                          <img
                            src={character.image_path}
                            alt={character.name}
                            className="h-full w-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              console.error(`画像の読み込みに失敗: ${character.name} (${character.image_path})`);
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <p className="text-center text-xs sm:text-sm font-bold text-gray-800 mb-1">
                          {character.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6 mb-4">
                    <button
                      onClick={() => setDisplayCount(prev => prev + LOAD_MORE_COUNT)}
                      className="px-6 py-3 bg-white/80 hover:bg-white text-gray-800 font-bold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                      さらに表示する ({filteredCharacters.length - displayCount}件)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

