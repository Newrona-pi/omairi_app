import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 画像のインポート
import toriiImage from './assets/torii.gif';
import keidaiImage from './assets/keidai.gif';
import emakakeImage from './assets/emakake.png';
import emaImage from './assets/ema.png';
import characterImage from './assets/character.png';
import minnaNoEmaImage from './assets/minna_no_ema.png';
import mikoCharacter from './assets/miko-character.png'; // 新しい巫女キャラクター

// 音声ファイルのインポート
import suzuSound from './assets/神社の鈴を鳴らす.mp3';

const App = () => {
  const [step, setStep] = useState(0); // 0: 初期画面, 1: 鳥居, 2: 境内, 3: 絵馬掛け, 4: 絵馬, 5: みんなの絵馬
  const [wish, setWish] = useState('');
  const [name, setName] = useState('');
  const [displayWish, setDisplayWish] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showWishForm, setShowWishForm] = useState(false); // 願い事フォームの表示状態
  const [selectedCharacter, setSelectedCharacter] = useState(null); // 選択されたキャラクター
  const [characters, setCharacters] = useState([]); // CSVから読み込んだキャラクター一覧
  const [loading, setLoading] = useState(true); // 読み込み状態
  const [searchTerm, setSearchTerm] = useState(''); // 検索キーワード
  const audioRef = useRef(null);
  const inputRef = useRef(null);

  // いいね数と自分が押したかどうかの管理
  const [likesMap, setLikesMap] = useState({}); // { [ema.id]: likeCount }
  const [likedSet, setLikedSet] = useState(new Set()); // Set of liked ema ids

  // みんなの絵馬データ
  const otherEmas = [
    { id: 1, wish: '世界平和', name: '名無し' },
    { id: 2, wish: '宝くじが当たりますように', name: '匿名希望' },
    { id: 3, wish: '健康第一', name: '健康志向' },
    { id: 4, wish: '良縁に恵まれますように', name: '縁結び' },
    { id: 5, wish: '商売繁盛', name: '事業主' },
    { id: 6, wish: '学業成就', name: '学生' },
    { id: 7, wish: '家内安全', name: '主婦' },
    { id: 8, wish: '無病息災', name: '長寿' },
    { id: 9, wish: '心願成就', name: '祈願' },
    { id: 10, wish: '試験合格', name: '受験生' },
    { id: 11, wish: '恋愛成就', name: '恋する人' },
    { id: 12, wish: '仕事がうまくいきますように', name: '会社員' },
    { id: 13, wish: '家族みんなが幸せでありますように', name: '家族思い' },
    { id: 14, wish: '夢が叶いますように', name: '夢追い人' },
    { id: 15, wish: '毎日が楽しく過ごせますように', name: '楽天家' },
  ].map(ema => ({ ...ema, createdAt: Date.now() - (16 - ema.id) * 60000 })); // idが大きいほど新しい

  // CSVファイルからキャラクター情報を読み込む
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}characters.csv`);
        const csvText = await response.text();
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        const characterData = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',');
          return {
            id: parseInt(values[0]),
            name: values[1],
            image_path: values[2],
            description: values[3]
          };
        });
        
        setCharacters(characterData);
        setLoading(false);
      } catch (error) {
        console.error('CSVファイルの読み込みに失敗しました:', error);
        // フォールバック: デフォルトのキャラクター
        setCharacters([
          { id: 1, name: 'お稲荷様', image_path: characterImage, description: '商売繁盛の神様' },
          { id: 2, name: '七福神', image_path: characterImage, description: '福を招く神様' },
          { id: 3, name: '天狗', image_path: characterImage, description: '山の修行者' },
          { id: 4, name: '狐', image_path: characterImage, description: '稲荷の使い' }
        ]);
        setLoading(false);
      }
    };

    loadCharacters();
  }, []);

  useEffect(() => {
    if (step === 2 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const handleInitialClick = () => {
    setStep(1);
  };

  const handleToriiClick = () => {
    setStep(2);
  };

  const handleSuzuClick = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    setShowWishForm(true); // 鐘をクリックした後にフォームを表示
  };

  const handleWishSubmit = (e) => {
    e.preventDefault();
    setDisplayWish(wish);
    setDisplayName(name);
    setStep(3); // 絵馬掛けではなく、キャラクター選択画面に移動
  };

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setStep(4); // 自分の絵馬画面に移動
  };

  const handleEmakakeClick = () => {
    setStep(4);
  };

  const handleEmaClick = () => {
    setStep(5);
  };

  const handleRestartClick = () => {
    setStep(0);
    setWish('');
    setName('');
    setDisplayWish('');
    setDisplayName('');
  };

  const handleViewMyEmaClick = () => {
    setStep(4);
  };

  // 検索フィルタリング
  const filteredCharacters = characters.filter(character =>
    character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    character.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="fixed inset-0 w-screen h-screen overflow-hidden" onClick={handleInitialClick}>
            <img src={characterImage} alt="Character" className="fs-img" />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <h1 className="text-white text-5xl font-bold animate-pulse">タイトル</h1>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="fixed inset-0 w-screen h-screen overflow-hidden" onClick={handleToriiClick}>
            <img src={toriiImage} alt="Torii" className="fs-img" />
          </div>
        );
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 w-screen h-screen overflow-hidden"
          >
            <img src={keidaiImage} alt="Keidai" className="fs-img" />
            <div
              className="absolute cursor-pointer bg-transparent"
              onClick={handleSuzuClick}
              style={{ 
                top: '60%', 
                left: '50%', 
                width: '10%', 
                height: '15%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10
              }}
            ></div>
            <audio ref={audioRef} src={suzuSound} preload="auto" />
            {showWishForm && (
              <form onSubmit={handleWishSubmit} className="absolute p-4 rounded-lg shadow-lg w-1/2"
                style={{ top: '70%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
                <textarea
                  ref={inputRef}
                  className="w-full p-2 mb-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="願い事を入力してください..."
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                  required
                ></textarea>
                <input
                  type="text"
                  className="w-full p-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="名前を入力してください..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                >
                  願い事を書く
                </button>
              </form>
            )}
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-b from-orange-200 to-orange-400"
          >
            <div className="absolute inset-0 p-8 overflow-y-auto">
              <h1 className="text-3xl font-bold text-center text-white mb-8 drop-shadow-lg">
                キャラクターを選んでください
              </h1>
              
              {/* 検索ボックス */}
              <div className="max-w-md mx-auto mb-8">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="キャラクター名や説明で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-white rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-800"
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
                    {filteredCharacters.length}件のキャラクターが見つかりました
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
                      <div className="text-2xl mb-4">😔</div>
                      <p className="text-lg mb-2">該当するキャラクターが見つかりませんでした</p>
                      <p className="text-sm opacity-80">検索キーワードを変更してお試しください</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                      {filteredCharacters.map((character) => (
                        <div 
                          key={character.id} 
                          className="bg-white rounded-lg shadow-lg p-4 cursor-pointer transform hover:scale-105 transition-transform duration-300 flex flex-col items-center aspect-[3/4] h-64 w-44"
                          onClick={() => handleCharacterSelect(character)}
                        >
                          <div className="w-full h-4/5 flex items-center justify-center mb-3">
                            <img 
                              src={character.image_path} 
                              alt={character.name} 
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                e.target.src = characterImage; // フォールバック画像
                              }}
                            />
                          </div>
                          <p className="text-center text-sm font-bold text-gray-800 mb-1">
                            {character.name}
                          </p>
                          <p className="text-center text-xs text-gray-600">
                            {character.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 w-screen h-screen overflow-hidden"
          >
            <img src={emaImage} alt="Ema" className="fs-img" />
            {/* キャラクター画像を絵馬の右下に配置 */}
            {selectedCharacter && (
              <div 
                className="absolute z-10"
                style={{ 
                  bottom: '80px', 
                  right: '400px' 
                }}
              >
                <img 
                  src={selectedCharacter.image_path} 
                  alt={selectedCharacter.name} 
                  className="w-60 h-70 object-contain"
                />
              </div>
            )}
            <p
              className="absolute text-black text-5xl font-handwriting"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60%',
                textAlign: 'center',
                whiteSpace: 'pre-wrap',
                fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
              }}
            >
              {displayWish}
            </p>
            <p
              className="absolute text-black text-4xl font-handwriting"
              style={{
                bottom: '15%',
                right: '77%',
                transform: 'translateX(50%)',
                fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
              }}
            >
              {displayName}
            </p>
            <button
              onClick={handleEmaClick}
              className="absolute bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
              style={{ bottom: '5%', left: '50%', transform: 'translateX(-50%)' }}
            >
              みんなの絵馬を見る
            </button>
          </motion.div>
        );
      case 5:
        // 自分の絵馬をotherEmasの先頭に追加
        const myEma = displayWish && displayName ? {
          id: 'my-ema',
          wish: displayWish,
          name: displayName,
          character: selectedCharacter,
          createdAt: Date.now()
        } : null;
        const allEmaList = [
          myEma,
          ...otherEmas
        ].filter(Boolean)
         .sort((a, b) => b.createdAt - a.createdAt); // 新着順

        // いいねボタンのハンドラ
        const handleLike = (id) => {
          if (likedSet.has(id)) return; // 1人1回
          setLikesMap(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
          setLikedSet(prev => new Set([...prev, id]));
        };

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-b from-orange-200 to-orange-400"
          >
            <div className="absolute inset-0 overflow-y-auto p-8">
              {/* 絵馬購入リンク */}
              <div className="flex justify-center mb-6">
                <a
                  href="https://newrona.jp/melofinity"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-yellow-300 hover:bg-yellow-400 text-red-700 font-bold py-3 px-6 rounded-lg shadow-lg text-xl transition mb-4 border-2 border-yellow-500 animate-pulse"
                  style={{ textDecoration: 'none' }}
                >
                  絵馬の購入はこちら
                </a>
              </div>
              <h1 className="text-3xl font-bold text-center text-white mb-8 drop-shadow-lg">
                みんなの絵馬
              </h1>
              <div className="grid grid-cols-4 gap-4 max-w-7xl mx-auto">
                {allEmaList.map((ema) => (
                  <div key={ema.id} className="relative transform hover:scale-105 transition-transform duration-300 bg-transparent">
                    <img 
                      src={minnaNoEmaImage} 
                      alt="絵馬" 
                      className="w-full h-64 object-cover rounded-md bg-transparent"
                      style={{ backgroundColor: 'transparent' }}
                    />
                    <div className="absolute inset-0 flex flex-col justify-center items-center p-4 pointer-events-none">
                      <p className="text-lg text-black mb-3 font-medium text-center leading-tight"
                         style={{
                           fontFamily: '"Hina Mincho", serif',
                           textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                           maxWidth: '70%',
                           position: 'absolute',
                           top: '60%',
                           left: '50%',
                           transform: 'translate(-50%, -50%)'
                         }}>
                        {ema.wish}
                      </p>
                      <p className="text-sm text-black font-medium"
                         style={{
                           fontFamily: '"Hina Mincho", serif',
                           textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                           position: 'absolute',
                           bottom: '10%',
                           right: '70%',
                           transform: 'translateX(50%)'
                         }}>
                        {ema.name}
                      </p>
                      {/* 自分の絵馬でキャラクター画像がある場合のみ右下に表示 */}
                      {ema.id === 'my-ema' && ema.character && (
                        <img
                          src={ema.character.image_path}
                          alt={ema.character.name}
                          className="absolute w-16 h-16 object-contain"
                          style={{ bottom: '8%', right: '12%' }}
                          onError={e => { e.target.src = characterImage; }}
                        />
                      )}
                      {/* いいねボタン */}
                      <button
                        type="button"
                        className="absolute flex items-center gap-1 px-2 py-1 rounded-full bg-white bg-opacity-80 shadow text-pink-600 text-sm font-bold pointer-events-auto hover:bg-pink-100 transition"
                        style={{ bottom: '8%', left: '8%' }}
                        onClick={() => handleLike(ema.id)}
                        disabled={likedSet.has(ema.id)}
                        aria-label="いいね"
                      >
                        <span role="img" aria-label="like">❤️</span>
                        {likesMap[ema.id] || 0}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col gap-4 z-10">
              <button
                onClick={handleViewMyEmaClick}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-md transition duration-300 shadow-lg"
              >
                自分の絵馬を見る
              </button>
              <button
                onClick={handleRestartClick}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-md transition duration-300 shadow-lg"
              >
                もう一度お参りをする
              </button>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className="fixed inset-0 w-screen h-screen"
      >
        {renderContent()}
      </motion.div>
    </AnimatePresence>
  );
};

export default App;
