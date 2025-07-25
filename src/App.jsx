import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const App = () => {
  const [step, setStep] = useState(1); // 1: 初期画面, 2: 鳥居, 3: 境内, 4: 絵馬掛け, 5: キャラ選択, 6: 自分の絵馬, 7: みんなの絵馬
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
  const crowAudioRef = useRef(null); // カラス音声用

  // いいね数と自分が押したかどうかの管理
  const [likesMap, setLikesMap] = useState({}); // { [ema.id]: likeCount }
  const [likedSet, setLikedSet] = useState(new Set()); // Set of liked ema ids
  // 並び替え方法の管理（false:新着順, true:いいね順）
  const [sortByLikes, setSortByLikes] = useState(false);

  // 実際のユーザーが書いた絵馬データ
  const [userEmas, setUserEmas] = useState([]); // 実際のユーザーが書いた絵馬

  // Firestoreから取得した絵馬データ
  const [emas, setEmas] = useState([]);

  // localStorageから絵馬データを読み込む
  useEffect(() => {
    const savedEmas = localStorage.getItem('userEmas');
    const savedLikes = localStorage.getItem('emaLikes');
    const savedLikedSet = localStorage.getItem('likedSet');
    
    if (savedEmas) {
      setUserEmas(JSON.parse(savedEmas));
    }
    if (savedLikes) {
      setLikesMap(JSON.parse(savedLikes));
    }
    if (savedLikedSet) {
      setLikedSet(new Set(JSON.parse(savedLikedSet)));
    }
  }, []);

  // 絵馬データをlocalStorageに保存する関数
  const saveEmaToStorage = (ema) => {
    const newEmas = [...userEmas, ema];
    setUserEmas(newEmas);
    localStorage.setItem('userEmas', JSON.stringify(newEmas));
  };

  // いいねデータをlocalStorageに保存する関数
  const saveLikesToStorage = (newLikesMap, newLikedSet) => {
    localStorage.setItem('emaLikes', JSON.stringify(newLikesMap));
    localStorage.setItem('likedSet', JSON.stringify([...newLikedSet]));
  };

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
          { id: 1, name: 'お稲荷様', image_path: 'assets/character.png', description: '商売繁盛の神様' },
          { id: 2, name: '七福神', image_path: 'assets/character.png', description: '福を招く神様' },
          { id: 3, name: '天狗', image_path: 'assets/character.png', description: '山の修行者' },
          { id: 4, name: '狐', image_path: 'assets/character.png', description: '稲荷の使い' }
        ]);
        setLoading(false);
      }
    };

    loadCharacters();
  }, []);

  useEffect(() => {
    if (step === 3 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  useEffect(() => {
    if (step === 3 && crowAudioRef.current) {
      crowAudioRef.current.currentTime = 0;
      crowAudioRef.current.play().catch(() => {});
    }
  }, [step]);

  useEffect(() => {
    if (step === 7) {
      const fetchEmas = async () => {
        const emasRef = collection(db, 'emas');
        const snapshot = await getDocs(emasRef);
        setEmas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchEmas();
    }
  }, [step]);

  const handleInitialClick = () => {
    setStep(2);
  };

  const handleToriiClick = () => {
    setStep(3);
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
    setStep(4); // 絵馬掛け画面に移動
  };

  const handleCharacterSelect = async (character) => {
    setSelectedCharacter(character);
    setStep(6); // 自分の絵馬画面に移動
    // Firestoreに絵馬を保存
    try {
      // characterオブジェクトからundefinedを除去
      const cleanCharacter = {};
      Object.entries(character).forEach(([key, value]) => {
        if (value !== undefined) cleanCharacter[key] = value;
      });
      await addDoc(collection(db, 'emas'), {
        wish: displayWish,
        name: displayName,
        character: cleanCharacter,
        created_at: serverTimestamp(),
        likes: 0
      });
    } catch (e) {
      console.error('絵馬の保存に失敗しました', e);
    }
  };

  const handleEmakakeClick = () => {
    setStep(5);
  };

  const handleEmaClick = () => {
    setStep(7);
  };

  const handleRestartClick = () => {
    setStep(1);
    setWish('');
    setName('');
    setDisplayWish('');
    setDisplayName('');
  };

  const handleViewMyEmaClick = () => {
    setStep(6);
  };

  // 検索フィルタリング
  const filteredCharacters = characters.filter(character =>
    (character.name && character.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (character.description && character.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 文字数に応じてフォントサイズを返す関数
  const getWishFontSize = (wish) => {
    if (!wish) return '1rem';
    if (wish.length <= 7) return '1.2rem';
    if (wish.length <= 16) return '1.1rem';
    if (wish.length <= 30) return '1rem';
    if (wish.length <= 40) return '0.9rem';
    return '0.8rem';
  };

  // 文字数に応じて名前のフォントサイズを返す関数
  const getNameFontSize = (name) => {
    if (!name) return '1rem';
    if (name.length <= 4) return '1rem';
    if (name.length <= 5) return '0.9rem';
    if (name.length <= 6) return '0.8rem';
    if (name.length <= 7) return '0.7rem';
    if (name.length <= 8) return '0.6rem';
    return '0.5rem';
  };

  // スマホ判定用state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // スマホ用：文字数に応じてフォントサイズを返す関数
  const getWishFontSizeMobile = (wish) => {
    if (!wish) return '1rem';
    if (wish.length <= 8) return '1.1rem';
    if (wish.length <= 14) return '1rem';
    if (wish.length <= 20) return '0.9rem';
    if (wish.length <= 30) return '0.8rem';
    return '0.7rem';
  };

  const renderContent = () => {
    switch (step) {
      case 1:
        // 初期画面
        return (
          <div className="fixed inset-0 w-screen h-screen overflow-hidden" onClick={handleInitialClick}>
            <img src="assets/character-CsFcZeIK.png" alt="Character" className="fs-img" />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <h1 className="text-white text-2xl sm:text-4xl md:text-5xl font-bold animate-pulse px-4 text-center">タイトル</h1>
            </div>
          </div>
        );
      case 2:
        // 鳥居
        return (
          <div className="fixed inset-0 w-screen h-screen overflow-hidden" onClick={e => { e.stopPropagation(); handleToriiClick(); }}>
            <img src="assets/torii-B6uLCy4r.gif" alt="Torii" className="fs-img" />
          </div>
        );
      case 3:
        // 境内（願い事入力）
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 w-screen h-screen overflow-hidden"
          >
            <img src="assets/keidai-C4Gy5nKi.gif" alt="Keidai" className="fs-img" />
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
            {/* 境内画面のaudioタグ */}
            <audio ref={audioRef} src="assets/神社の鈴を鳴らす-CfX4AAZh.mp3" preload="auto" />
            {/* カラスが鳴く夕方.mp3 を自動再生 */}
            <audio ref={crowAudioRef} src="assets/カラスが鳴く夕方.mp3" preload="auto" />
            {showWishForm && (
              <div className="fixed inset-0 flex justify-center items-end pointer-events-none z-0 pb-3">
                <motion.img
                  src="assets/minna_no_ema-DuqMoW9J.png"
                  alt="絵馬"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="w-[80vw] max-w-[900px] h-auto"
                  draggable={false}
                />
              </div>
            )}
            {showWishForm && (
              <div className="fixed inset-0 flex justify-center items-end pb-10 pointer-events-none z-10">
                <motion.form
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  onSubmit={handleWishSubmit}
                  className="p-4 rounded-lg shadow-lg w-full max-w-md bg-transparent pointer-events-auto"
                >
                  <textarea
                    ref={inputRef}
                    className="block w-full p-2 mb-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-white text-black"
                    rows="4"
                    placeholder="願い事を入力してください..."
                    value={wish}
                    onChange={(e) => setWish(e.target.value)}
                    required
                  ></textarea>
                  <input
                    type="text"
                    className="block w-full p-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="名前を入力してください..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                  >
                    願い事を書く
                  </button>
                </motion.form>
              </div>
            )}
          </motion.div>
        );
      case 4:
        // 絵馬掛け画像
        return (
          <div className="fixed inset-0 w-screen h-screen overflow-hidden" onClick={handleEmakakeClick}>
            <img src="assets/emakake-DeXitYVn.png" alt="絵馬掛け" className="fs-img" />
          </div>
        );
      case 5:
        // キャラクター選択画面
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-b from-orange-200 to-orange-400"
          >
            <div className="absolute inset-0 p-4 sm:p-6 md:p-8 overflow-y-auto">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-white mb-4 sm:mb-6 md:mb-8 drop-shadow-lg">
                キャラクターを選んでください
              </h1>
              {/* 検索ボックス */}
              <div className="max-w-md mx-auto mb-4 sm:mb-6 md:mb-8">
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 max-w-6xl mx-auto">
                      {filteredCharacters.map((character) => (
                        <div
                          key={character.id}
                          className="bg-white rounded-lg shadow-lg p-2 sm:p-3 md:p-4 cursor-pointer transform hover:scale-105 transition-transform duration-300 flex flex-col items-center aspect-[3/4] h-48 sm:h-56 md:h-64 w-32 sm:w-36 md:w-44"
                          onClick={() => handleCharacterSelect(character)}
                        >
                          <div className="w-full h-4/5 flex items-center justify-center mb-3">
                            <img
                              src={character.image_path}
                              alt={character.name}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                e.target.src = 'assets/character.png'; // フォールバック画像
                              }}
                            />
                          </div>
                          <p className="text-center text-xs sm:text-sm font-bold text-gray-800 mb-1">
                            {character.name}
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
      case 6:
        // 自分の絵馬画面
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 w-screen h-screen overflow-hidden"
          >
            <img src="assets/ema-B7JpMnqw.png" alt="Ema" className="fs-img" />
            {/* キャラクター画像を絵馬の右下に配置 */}
            {selectedCharacter && (
              <div 
                className="absolute z-0 hidden sm:block"
                style={{ 
                  bottom: '80px', 
                  right: '320px' 
                }}
              >
                <img 
                  src={selectedCharacter.image_path} 
                  alt={selectedCharacter.name} 
                  style={{ 
                    width: '480px', 
                    height: '560px', 
                    objectFit: 'contain' 
                  }}
                />
              </div>
            )}
            {/* スマホ用キャラクター画像 */}
            {selectedCharacter && (
              <div 
                className="absolute z-0 sm:hidden"
                style={{ 
                  bottom: '20px', 
                  right: '20px' 
                }}
              >
                <img 
                  src={selectedCharacter.image_path} 
                  alt={selectedCharacter.name} 
                  style={{ 
                    width: '120px', 
                    height: '140px', 
                    objectFit: 'contain' 
                  }}
                />
              </div>
            )}
            <p
              className="absolute text-black text-lg sm:text-3xl md:text-5xl font-handwriting z-10"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                textAlign: 'center',
                whiteSpace: 'pre-wrap',
                fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
              }}
            >
              {displayWish}
            </p>
            <p
              className="absolute text-black text-lg sm:text-2xl md:text-4xl font-handwriting z-10"
              style={{
                bottom: '15%',
                right: '70%',
                transform: 'translateX(50%)',
                fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
              }}
            >
              {displayName}
            </p>
            <button
              onClick={handleEmaClick}
              className="absolute custom-outline-btn z-10"
              style={{ top: '5%', right: '5%', minWidth: '220px' }}
            >
              <span className="btn-label-highlight">みんなの絵馬を見る</span>
              <span className="btn-arrow-highlight">&gt;</span>
            </button>
          </motion.div>
        );
      case 7:
        // みんなの絵馬画面
        const allEmaList = emas
          .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)); // 新着順
        // いいねボタンのハンドラ
        const handleLike = (id) => {
          if (likedSet.has(id)) return; // 1人1回
          const newLikesMap = { ...likesMap, [id]: (likesMap[id] || 0) + 1 };
          const newLikedSet = new Set([...likedSet, id]);
          setLikesMap(newLikesMap);
          setLikedSet(newLikedSet);
          saveLikesToStorage(newLikesMap, newLikedSet);
        };
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 w-screen h-screen overflow-hidden"
          >
            <img 
              src="assets/everyones-ema-background.png" 
              alt="みんなの絵馬背景" 
              className="absolute inset-0 w-full h-full object-cover z-0 blur-sm" 
              draggable={false}
            />
            <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 md:p-8">
              <h1 className="text-3xl font-bold text-center text-white mb-8 drop-shadow-lg">
                ～ みんなの絵馬 ～
              </h1>
              {/* 並び替えスイッチ */}
              <div className="flex justify-center items-center mb-4">
                <span className="text-white mr-2 text-sm">新着順</span>
                <button
                  onClick={() => setSortByLikes(!sortByLikes)}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${sortByLikes ? 'bg-pink-400' : 'bg-gray-300'}`}
                  aria-label="並び替えスイッチ"
                  style={{ minWidth: '56px' }}
                >
                  <span
                    className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${sortByLikes ? 'translate-x-7' : ''}`}
                    style={{ transform: sortByLikes ? 'translateX(28px)' : 'none' }}
                  ></span>
                </button>
                <span className="text-white ml-2 text-sm">いいね順</span>
              </div>
              {/* 絵馬の購入はこちらからボタンと操作ボタンをまとめて上部に表示 */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <a
                  href="https://newrona.jp/melofinity"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="custom-outline-btn mx-auto mb-2"
                  style={{ textDecoration: 'none', textShadow: '0 0 3px #fff, 0 0 3px #fff' }}
                >
                  <span className="btn-label-highlight">絵馬の購入はこちらから</span>
                  <span className="btn-arrow-highlight">&gt;</span>
                </a>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={handleViewMyEmaClick}
                    className="custom-outline-btn mx-auto mb-2"
                  >
                    <span className="btn-label-highlight">自分の絵馬を見る</span>
                    <span className="btn-arrow-highlight">&gt;</span>
                  </button>
                  <button
                    onClick={handleRestartClick}
                    className="custom-outline-btn mx-auto mb-2"
                  >
                    <span className="btn-label-highlight">もう一度お参りをする</span>
                    <span className="btn-arrow-highlight">&gt;</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-7xl mx-auto">
                {allEmaList.length === 0 ? (
                  <div className="col-span-4 text-center text-white text-xl py-8">
                    まだ絵馬が投稿されていません。<br />
                    最初の絵馬を書いてみませんか？
                  </div>
                ) : (
                  allEmaList.map((ema) => (
                    <div key={ema.id} className="relative transform hover:scale-105 transition-transform duration-300 bg-transparent">
                      <img 
                        src="assets/minna_no_ema-DuqMoW9J.png" 
                        alt="絵馬" 
                        className="w-full h-48 object-cover rounded-md bg-transparent"
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
                             transform: 'translate(-50%, -50%)',
                             fontSize: isMobile ? getWishFontSizeMobile(ema.wish) : getWishFontSize(ema.wish),
                             wordBreak: 'break-word',
                             whiteSpace: 'pre-wrap'
                           }}>
                          {ema.wish}
                        </p>
                        <p className="text-sm text-black font-medium"
                           style={{
                             fontFamily: '"Hina Mincho", serif',
                             textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                             position: 'absolute',
                             bottom: isMobile ? '20%' : '10%',
                             right: '65%',
                             transform: 'translateX(50%)',
                             fontSize: getNameFontSize(ema.name),
                             maxWidth: '60%',
                             overflow: 'hidden',
                             textOverflow: 'ellipsis',
                             whiteSpace: 'nowrap'
                           }}>
                          {ema.name}
                        </p>
                        {/* キャラクター画像がある場合のみ右下に表示 */}
                        {ema.character && (
                          <img
                            src={ema.character.image_path}
                            alt={ema.character.name}
                            className="absolute w-16 h-16 object-contain"
                            style={isMobile ? { bottom: '20%', right: '-2%' } : { bottom: '4%', right: '18%' }}
                            onError={e => { e.target.src = 'assets/character.png'; }}
                          />
                        )}
                        {/* いいねボタン PC表示のみ */}
                        {!isMobile && (
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
                        )}
                      </div>
                      {/* いいねボタン スマホ表示のみ（絵馬の下に独立して配置） */}
                      {isMobile && (
                        <div className="flex justify-center mt-2">
                          <button
                            type="button"
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-white bg-opacity-80 shadow text-pink-600 text-sm font-bold pointer-events-auto hover:bg-pink-100 transition"
                            onClick={() => handleLike(ema.id)}
                            disabled={likedSet.has(ema.id)}
                            aria-label="いいね"
                          >
                            <span role="img" aria-label="like">❤️</span>
                            {likesMap[ema.id] || 0}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
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
