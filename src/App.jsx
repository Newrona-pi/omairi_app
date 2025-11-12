import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from './firebase';

// 再帰的にundefinedを除去する関数
function removeUndefined(obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return obj;
}

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
  const bgmAudioRef = useRef(null); // BGM用

  // いいね数と自分が押したかどうかの管理
  const [likedSet, setLikedSet] = useState(new Set()); // Set of liked ema ids
  // 並び替え方法の管理（false:新着順, true:いいね順）
  const [sortByLikes, setSortByLikes] = useState(false);

  // 実際のユーザーが書いた絵馬データ
  const [userEmas, setUserEmas] = useState([]); // 実際のユーザーが書いた絵馬

  // Firestoreから取得した絵馬データ
  const [emas, setEmas] = useState([]);

  // 自分の絵馬画面でのボタン表示状態
  const [showButtons, setShowButtons] = useState(true);

  // 拡大表示する絵馬
  const [expandedEma, setExpandedEma] = useState(null);

  // BGM再生状態（useRefで管理して常に最新の値を参照）
  const bgmStartedRef = useRef(false);

  // localStorageから絵馬データを読み込む
  useEffect(() => {
    const savedEmas = localStorage.getItem('userEmas');
    const savedLikes = localStorage.getItem('emaLikes');
    const savedLikedSet = localStorage.getItem('likedSet');
    
    if (savedEmas) {
      setUserEmas(JSON.parse(savedEmas));
    }
    if (savedLikes) {
      // likesMapは不要になったため、localStorageから削除
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
  const saveLikesToStorage = (newLikedSet) => {
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
          { id: 1, name: 'そらねなご', image_path: 'new-png-assets2/01_そらねなご.png', description: 'そらねなご' },
          { id: 2, name: '天輪ちゃちゃ', image_path: 'new-png-assets2/02_天輪ちゃちゃ.png', description: '天輪ちゃちゃ' },
          { id: 3, name: '熊蜂えま', image_path: 'new-png-assets2/03_熊蜂えま.png', description: '熊蜂えま' },
          { id: 4, name: 'ラビスベレイ', image_path: 'new-png-assets2/04_ラビスベレイ.png', description: 'ラビスベレイ' }
        ]);
        setLoading(false);
      }
    };

    loadCharacters();
  }, []);

  // Firestoreから絵馬データを取得する関数
  const fetchEmas = async () => {
    const emasRef = collection(db, 'emas');
    const snapshot = await getDocs(emasRef);
    setEmas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    if (step === 7) {
      fetchEmas();
    }
  }, [step]);

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

  // BGMを自動再生
  useEffect(() => {
    if (bgmAudioRef.current) {
      bgmAudioRef.current.volume = 0.5; // 音量を50%に設定
      bgmAudioRef.current.loop = true; // ループ再生
      // 自動再生を試みる
      bgmAudioRef.current.play()
        .then(() => {
          bgmStartedRef.current = true;
        })
        .catch(e => {
          console.log('BGM auto-play failed, will try on user interaction:', e);
          // 自動再生が失敗した場合、ユーザーインタラクション時に再生を試みる
          const tryPlayOnInteraction = () => {
            if (bgmAudioRef.current && !bgmStartedRef.current) {
              bgmAudioRef.current.volume = 0.5;
              bgmAudioRef.current.loop = true;
              bgmAudioRef.current.play()
                .then(() => {
                  bgmStartedRef.current = true;
                  document.removeEventListener('click', tryPlayOnInteraction);
                  document.removeEventListener('touchstart', tryPlayOnInteraction);
                })
                .catch(() => {});
            }
          };
          document.addEventListener('click', tryPlayOnInteraction, { once: true });
          document.addEventListener('touchstart', tryPlayOnInteraction, { once: true });
        });
    }
  }, []);

  const handleInitialClick = () => {
    // まだBGMが開始されていない場合、クリック時に開始を試みる
    if (bgmAudioRef.current && !bgmStartedRef.current) {
      bgmAudioRef.current.volume = 0.5;
      bgmAudioRef.current.loop = true;
      bgmAudioRef.current.play()
        .then(() => {
          bgmStartedRef.current = true;
        })
        .catch(e => console.log('BGM play failed:', e));
    }
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
      // characterがundefined/nullの場合は空オブジェクトに
      const cleanCharacter = character ? removeUndefined(character) : {};
      // descriptionフィールドを明示的に除外
      const { description, ...characterWithoutDescription } = cleanCharacter;
      console.log('character before save:', character);
      console.log('cleanCharacter:', cleanCharacter);
      await addDoc(collection(db, 'emas'), {
        wish: displayWish,
        name: displayName,
        character: characterWithoutDescription,
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
    setShowButtons(true); // 自分の絵馬画面に戻った時にボタンを表示
  };

  // 自分の絵馬画面での背景クリック処理
  const handleMyEmaBackgroundClick = (e) => {
    // ボタンエリアをクリックした場合は何もしない
    if (e.target.closest('.button-container')) {
      return;
    }
    setShowButtons(prev => !prev);
  };

  // 検索フィルタリング
  const filteredCharacters = characters.filter(character =>
    (character.name && character.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (character.description && character.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 10文字ごとに改行を挿入する関数
  const insertLineBreaks = (text) => {
    if (!text) return '';
    // 改行文字を削除してから処理
    const cleanText = text.replace(/\n/g, '');
    const lines = [];
    for (let i = 0; i < cleanText.length; i += 10) {
      lines.push(cleanText.slice(i, i + 10));
    }
    return lines.join('\n');
  };

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
  const getIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  };
  const [isMobile, setIsMobile] = useState(() => getIsMobile());
  useEffect(() => {
    const handleResize = () => setIsMobile(getIsMobile());
    window.addEventListener('resize', handleResize);
    handleResize();
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
            <video
              src="assets/20251105_1610_01k99a5pnjeehv67080p2z5cg7.mp4"
              className="fs-img"
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img 
                src="assets/推しの護符.png" 
                alt="推しの護符" 
                className="max-w-[100vw] max-h-[100vh] w-auto h-auto object-contain animate-pulse"
              />
            </div>
          </div>
        );
      case 2:
        // 鳥居
        return (
          <div className="fixed inset-0 w-screen h-screen overflow-hidden" onClick={e => { e.stopPropagation(); handleToriiClick(); }}>
            <video
              src="assets/20251105_1610_01k99a5pnjeehv67080p2z5cg7.mp4"
              className="fs-img"
              autoPlay
              loop
              muted
              playsInline
            />
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
            onClick={!showWishForm ? handleSuzuClick : undefined}
          >
            <video
              src="assets/20251105_1632_01k99etw4xe4j9681aw748nwcr.mp4"
              className="fs-img"
              autoPlay
              loop
              muted
              playsInline
            />
            {/* 全画面クリックで鈴を鳴らす。フォーム表示後は無効化 */}
            {/* 境内画面のaudioタグ */}
            <audio ref={audioRef} src="assets/神社の鈴を鳴らす-CfX4AAZh.mp3" preload="auto" />
            {/* カラスが鳴く夕方.mp3 を自動再生 */}
            <audio ref={crowAudioRef} src="assets/カラスが鳴く夕方.mp3" preload="auto" />
            {showWishForm && !isMobile && (
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
                    placeholder="願い事を入力してください（30文字まで）..."
                    value={wish}
                    onChange={(e) => setWish(e.target.value)}
                    maxLength={30}
                    required
                  ></textarea>
                  <input
                    type="text"
                    className="block w-full p-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="名前を入力してください（10文字まで）..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={10}
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
            <video
              src="assets/20251105_1612_01k99dqb5jfeyss6nv2m5s4kbj.mp4"
              className="fs-img"
              autoPlay
              loop
              muted
              playsInline
            />
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-white mb-4 sm:mb-6 md:mb-8 drop-shadow-lg">
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
                    className="w-full px-4 py-3 pl-12 bg-white rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800"
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
                      <div className="text-2xl mb-4">😔</div>
                      <p className="text-lg mb-2">該当する推し候補が見つかりませんでした</p>
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
                                e.target.src = 'new-png-assets2/01_そらねなご.png'; // フォールバック画像
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
        const emaContainerStyle = isMobile
          ? {
              width: 'min(92vw, calc(92vh * 1.5))',
              maxWidth: '640px',
              aspectRatio: '3 / 2'
            }
          : {
              width: 'min(80vw, calc(80vh * 1.5))',
              maxWidth: '960px',
              aspectRatio: '3 / 2'
            };

        const wishContainerStyle = isMobile
          ? {
              top: '48%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '68%',
              height: '36%',
              padding: '3% 4%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          : {
              top: '46%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '56%',
              height: '34%',
              padding: '3% 5%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            };

        const wishTextStyle = isMobile
          ? {
              fontSize: 'clamp(1.05rem, 4.8vw, 1.6rem)',
              lineHeight: 1.4,
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
              textShadow: '2px 2px 4px rgba(255,255,255,0.85)',
              margin: 0,
              width: '100%'
            }
          : {
              fontSize: 'clamp(1.2rem, 2.7vw, 2.3rem)',
              lineHeight: 1.45,
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
              textShadow: '2px 2px 4px rgba(255,255,255,0.85)',
              margin: 0,
              width: '100%'
            };

        const nameContainerStyle = isMobile
          ? {
              bottom: '26%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '56%',
              height: '10%',
              padding: '0 6%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflow: 'hidden'
            }
          : {
              bottom: '22%',
              left: '26%',
              width: '24%',
              height: '10%',
              padding: '0 6%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflow: 'hidden'
            };

        const nameTextStyle = isMobile
          ? {
              fontSize: 'clamp(0.95rem, 3.5vw, 1.25rem)',
              fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
              textShadow: '2px 2px 4px rgba(255,255,255,0.85)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: displayName.length > 10 ? 'ellipsis' : 'clip',
              width: '100%'
            }
          : {
              fontSize: 'clamp(1rem, 1.8vw, 1.6rem)',
              fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
              textShadow: '2px 2px 4px rgba(255,255,255,0.85)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: displayName.length > 10 ? 'ellipsis' : 'clip',
              width: '100%'
            };

        const characterContainerStyle = isMobile
          ? {
              bottom: '8%',
              right: '16%',
              width: '36%',
              height: '44%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              overflow: 'hidden'
            }
          : {
              bottom: '6%',
              right: '14%',
              width: '30%',
              height: '50%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              overflow: 'hidden'
            };

        const buttonContainerStyle = isMobile
          ? {
              bottom: '4%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'stretch'
            }
          : {
              top: '5%',
              right: '5%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              alignItems: 'flex-end'
            };

        const buttonClassName = `custom-outline-btn${isMobile ? ' w-full text-base' : ''}`;

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className={`fixed inset-0 w-screen h-screen ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'}`}
            onClick={handleMyEmaBackgroundClick}
          >
            <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
              <div className="relative" style={emaContainerStyle}>
                <img
                  src="assets/ema1105-2.png"
                  alt="Ema"
                  className="absolute inset-0 w-full h-full object-contain select-none"
                  draggable={false}
                />

                {/* 願い事用の透明コンテナ */}
                <div className="absolute z-10" style={wishContainerStyle}>
                  <p className="text-black font-handwriting" style={wishTextStyle}>
                    {insertLineBreaks(displayWish)}
                  </p>
                </div>

                {/* 名前用の透明コンテナ */}
                <div className="absolute z-10" style={nameContainerStyle}>
                  <p className="text-black font-handwriting" style={nameTextStyle}>
                    {displayName}
                  </p>
                </div>

                {/* キャラクター画像用の透明コンテナ */}
                {selectedCharacter && (
                  <div className="absolute z-0" style={characterContainerStyle}>
                    <img
                      src={selectedCharacter.image_path}
                      alt={selectedCharacter.name}
                      className="w-full h-full object-contain select-none"
                      draggable={false}
                    />
                  </div>
                )}
              </div>
            </div>
            <AnimatePresence>
              {showButtons && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute z-10 button-container"
                  style={buttonContainerStyle}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleEmaClick}
                    className={buttonClassName}
                  >
                    <span className="btn-label-highlight">みんなの絵馬を見る</span>
                    <span className="btn-arrow-highlight">&gt;</span>
                  </button>
                  <a
                    href="https://newrona.jp/melofinity"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClassName}
                    style={{ textDecoration: 'none', textShadow: '0 0 3px #fff, 0 0 3px #fff' }}
                  >
                    <span className="btn-label-highlight">絵馬の購入はこちらから</span>
                    <span className="btn-arrow-highlight">&gt;</span>
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      case 7:
        // みんなの絵馬画面
        const allEmaList = [...emas].sort((a, b) => {
          if (sortByLikes) {
            return (b.likes || 0) - (a.likes || 0); // Firestoreのlikesを使用
          } else {
            return (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0); // 新着順
          }
        });
        // いいねボタンのハンドラ
        const handleLike = async (id) => {
          if (likedSet.has(id)) return; // 1人1回
          try {
            const emaRef = doc(db, 'emas', id);
            console.log('like update: id', id, 'emaRef.path', emaRef.path);
            await updateDoc(emaRef, { likes: increment(1) });
            setLikedSet(new Set([...likedSet, id]));
            saveLikesToStorage(new Set([...likedSet, id]));
            await fetchEmas(); // いいね更新後に再取得
            console.log('after update, emas:', emas);
          } catch (e) {
            console.error('いいねの更新に失敗しました', e);
          }
        };
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
              className="absolute inset-0 w-full h-full object-cover z-0 blur-sm"
              autoPlay
              loop
              muted
              playsInline
              style={{ filter: 'blur(8px)' }}
            />
            <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 md:p-8">
              <h1 className="text-3xl font-bold text-center text-white mb-8 drop-shadow-lg">
                ～ みんなの絵馬 ～
              </h1>
              {/* 並び替え（トグルスイッチ） */}
              <div className="flex justify-center items-center mb-4 gap-3">
                <span className="text-white text-sm">新着順</span>
                <button
                  onClick={() => setSortByLikes(!sortByLikes)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    sortByLikes ? 'bg-red-600' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={sortByLikes}
                  aria-label="並び替え切り替え"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      sortByLikes ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-white text-sm">いいね順</span>
              </div>
              {/* 操作ボタンをまとめて上部に表示 */}
              <div className="flex flex-col items-center gap-4 mb-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
                {allEmaList.length === 0 ? (
                  <div className="col-span-4 text-center text-white text-xl py-8">
                    まだ絵馬が投稿されていません。<br />
                    最初の絵馬を書いてみませんか？
                  </div>
                ) : (
                  allEmaList.map((ema) => (
                    <div 
                      key={ema.id} 
                      className="relative transform hover:scale-105 transition-transform duration-300 bg-transparent cursor-pointer"
                      onClick={() => setExpandedEma(ema)}
                    >
                      <img 
                        src="assets/ema-transparent.png" 
                        alt="絵馬" 
                        className="w-full h-48 object-cover rounded-md bg-transparent"
                        style={{ backgroundColor: 'transparent' }}
                      />
                      <div className="absolute inset-0 flex flex-col justify-center items-center p-4 pointer-events-none">
                        <p className="text-lg text-black mb-3 font-medium text-center leading-tight"
                           style={{
                             fontFamily: '"Hina Mincho", serif',
                             textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                             maxWidth: '75%',
                             position: 'absolute',
                             top: isMobile ? '50%' : '60%',
                             left: '50%',
                             transform: 'translate(-50%, -50%)',
                             fontSize: isMobile ? getWishFontSizeMobile(ema.wish) : getWishFontSize(ema.wish),
                             wordBreak: 'keep-all',
                             whiteSpace: 'pre',
                             overflowWrap: 'normal'
                           }}>
                          {insertLineBreaks(ema.wish)}
                        </p>
                        <p className="text-sm text-black font-medium"
                           style={{
                             fontFamily: '"Hina Mincho", serif',
                             textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                             position: 'absolute',
                             bottom: isMobile ? '18%' : '10%',
                             right: isMobile ? '50%' : '65%',
                             transform: isMobile ? 'translate(50%, 0)' : 'translateX(50%)',
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
                            style={isMobile ? { bottom: '10%', right: '12%' } : { bottom: '4%', right: '18%' }}
                            onError={e => { e.target.src = 'new-png-assets/01_そらねなご.png'; }}
                          />
                        )}
                        {/* いいねボタン PC表示のみ */}
                        {!isMobile && (
                          <button
                            type="button"
                            className="absolute flex items-center gap-1 px-2 py-1 rounded-full bg-white bg-opacity-80 shadow text-pink-600 text-sm font-bold pointer-events-auto hover:bg-pink-100 transition"
                            style={{ bottom: '8%', left: '8%' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(ema.id);
                            }}
                            disabled={likedSet.has(ema.id)}
                            aria-label="いいね"
                          >
                            <span role="img" aria-label="like">❤️</span>
                            {ema.likes || 0}
                          </button>
                        )}
                      </div>
                      {/* いいねボタン スマホ表示のみ（絵馬の下に独立して配置） */}
                      {isMobile && (
                        <div className="flex justify-center mt-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-white bg-opacity-80 shadow text-pink-600 text-sm font-bold pointer-events-auto hover:bg-pink-100 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(ema.id);
                            }}
                            disabled={likedSet.has(ema.id)}
                            aria-label="いいね"
                          >
                            <span role="img" aria-label="like">❤️</span>
                            {ema.likes || 0}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* 拡大表示モーダル */}
            <AnimatePresence>
              {expandedEma && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                  onClick={() => setExpandedEma(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-[90vw] max-w-[800px] h-[80vh] max-h-[900px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img 
                      src="assets/ema-transparent.png" 
                      alt="絵馬" 
                      className="w-full h-full object-contain"
                    />
                    {/* 願い事 */}
                    <div
                      className="absolute z-10"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '60%',
                        maxHeight: '40%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <p
                        className="text-black font-handwriting text-center"
                        style={{
                          fontSize: 'clamp(1.2rem, 2.8vw, 3rem)',
                          whiteSpace: 'pre',
                          wordBreak: 'keep-all',
                          fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                          textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                          margin: 0,
                          padding: 0,
                          width: '100%',
                        }}
                      >
                        {insertLineBreaks(expandedEma.wish)}
                      </p>
                    </div>
                    {/* 名前 */}
                    <div
                      className="absolute z-10"
                      style={{
                        bottom: '35%',
                        right: '47%',
                        width: '30%',
                        maxHeight: '8%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                      }}
                    >
                      <p
                        className="text-black font-handwriting"
                        style={{
                          fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                          fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                          textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                          margin: 0,
                          padding: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        {expandedEma.name}
                      </p>
                    </div>
                    {/* キャラクター画像 */}
                    {expandedEma.character && (
                      <div 
                        className="absolute z-0"
                        style={{ 
                          bottom: '35%',
                          right: '8%',
                          width: '30%',
                          height: '50%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                        }}
                      >
                        <img 
                          src={expandedEma.character.image_path} 
                          alt={expandedEma.character.name} 
                          style={{ 
                            width: '70%',
                            height: 'auto',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                          onError={e => { e.target.src = 'new-png-assets2/01_そらねなご.png'; }}
                        />
                      </div>
                    )}
                    {/* 閉じるボタン */}
                    <button
                      onClick={() => setExpandedEma(null)}
                      className="absolute top-4 right-4 z-20 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold text-gray-800 shadow-lg transition-all"
                      aria-label="閉じる"
                    >
                      ×
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* BGM - AnimatePresenceの外に配置して常に存在させる */}
      <audio ref={bgmAudioRef} src="assets/夢の小舟.mp3" preload="auto" autoPlay loop muted={false} />
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
    </>
  );
};

export default App;
