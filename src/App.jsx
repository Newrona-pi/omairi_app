import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useMobile } from './hooks/useMobile';
import { parseCSVLine } from './utils/characterUtils';
import { WishForm } from './components/WishForm';
import { CharacterSelection } from './components/CharacterSelection';
import { EmaDisplay } from './components/EmaDisplay';
import { AllEmas } from './components/AllEmas';
// EmaAdminは動的インポート（開発中）

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

// EmaAdminを動的インポートするラッパーコンポーネント
const EmaAdminWrapper = ({ onBack }) => {
  const [EmaAdminComponent, setEmaAdminComponent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('./components/EmaAdmin')
      .then(module => {
        setEmaAdminComponent(() => module.EmaAdmin);
        setLoading(false);
      })
      .catch(() => {
        console.warn('EmaAdmin component not available');
        setEmaAdminComponent(null);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 text-white">
        <div>読み込み中...</div>
      </div>
    );
  }

  if (!EmaAdminComponent) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 text-white">
        <div>管理画面は現在利用できません</div>
      </div>
    );
  }

  return <EmaAdminComponent onBack={onBack} />;
};

const App = () => {
  const [step, setStep] = useState(1); // 1: 初期画面, 2: 鳥居, 3: 境内, 4: 絵馬掛け, 5: キャラ選択, 6: 自分の絵馬, 7: みんなの絵馬, 8: 管理画面
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
  const emaImageRef = useRef(null); // 絵馬画像用
  const isMobile = useMobile();

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
        
        const characterData = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = parseCSVLine(line);
          const character = {
            id: parseInt(values[0]),
            name: values[1],
            image_path: values[2],
            description: values[3]
          };
          // デバッグ: 31番のキャラクターをログ出力
          if (character.id === 31) {
            console.log('31番キャラクター:', character);
          }
          return character;
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

  // URLパラメータで管理画面にアクセス
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setStep(8);
    }
  }, []);

  // キーボードショートカット（Ctrl+Shift+A）で管理画面にアクセス
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setStep(8);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // BGMを自動再生
  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;

    const tryPlayOnInteraction = () => {
      if (!bgmAudioRef.current || bgmStartedRef.current) return;
      bgmAudioRef.current.volume = 0.5;
      bgmAudioRef.current.loop = true;
      bgmAudioRef.current
        .play()
        .then(() => {
          bgmStartedRef.current = true;
          document.removeEventListener('click', tryPlayOnInteraction);
          document.removeEventListener('touchstart', tryPlayOnInteraction);
        })
        .catch(() => {});
    };

    audio.volume = 0.5;
    audio.loop = true;
    audio
      .play()
      .then(() => {
        bgmStartedRef.current = true;
      })
      .catch(() => {
        document.addEventListener('click', tryPlayOnInteraction, { once: true });
        document.addEventListener('touchstart', tryPlayOnInteraction, { once: true });
      });

    return () => {
      document.removeEventListener('click', tryPlayOnInteraction);
      document.removeEventListener('touchstart', tryPlayOnInteraction);
    };
  }, []);

  const handleInitialClick = () => {
    if (bgmAudioRef.current && !bgmStartedRef.current) {
      bgmAudioRef.current.volume = 0.5;
      bgmAudioRef.current.loop = true;
      bgmAudioRef.current.play().catch(() => {});
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

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setStep(6); // 自分の絵馬画面に移動
  };

  const handleEmakakeClick = () => {
    setStep(5);
  };

  const handleEmaClick = async () => {
    // みんなの絵馬画面に遷移する前にFirestoreに絵馬を保存
    try {
      // characterがundefined/nullの場合は空オブジェクトに
      const cleanCharacter = selectedCharacter ? removeUndefined(selectedCharacter) : {};
      // descriptionフィールドを明示的に除外
      const { description, ...characterWithoutDescription } = cleanCharacter;
      console.log('character before save:', selectedCharacter);
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

  // キャラクター選択画面に戻る処理
  const handleBackToCharacterSelection = () => {
    setStep(5);
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
            {/* 音声再生の喚起表示 */}
            <div className="absolute top-4 right-4 pointer-events-none z-10">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm sm:text-base">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
                  />
                </svg>
                <span className="font-medium">音声が流れます</span>
              </div>
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
              <WishForm
                wish={wish}
                setWish={setWish}
                name={name}
                setName={setName}
                handleWishSubmit={handleWishSubmit}
                inputRef={inputRef}
                isMobile={isMobile}
              />
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
          <CharacterSelection
            characters={characters}
            loading={loading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleCharacterSelect={handleCharacterSelect}
          />
        );
      case 6:
        // 自分の絵馬画面
        return (
          <EmaDisplay
            displayWish={displayWish}
            displayName={displayName}
            selectedCharacter={selectedCharacter}
            showButtons={showButtons}
            handleMyEmaBackgroundClick={handleMyEmaBackgroundClick}
            handleEmaClick={handleEmaClick}
            handleBackToCharacterSelection={handleBackToCharacterSelection}
            isMobile={isMobile}
            emaImageRef={emaImageRef}
          />
        );
      case 7:
        // みんなの絵馬画面
        return (
          <AllEmas
            emas={emas}
            sortByLikes={sortByLikes}
            setSortByLikes={setSortByLikes}
            handleViewMyEmaClick={handleViewMyEmaClick}
            handleRestartClick={handleRestartClick}
            likedSet={likedSet}
            setLikedSet={setLikedSet}
            saveLikesToStorage={saveLikesToStorage}
            fetchEmas={fetchEmas}
            expandedEma={expandedEma}
            setExpandedEma={setExpandedEma}
            isMobile={isMobile}
          />
        );
      case 8:
        // 管理画面（動的インポート）
        return (
          <EmaAdminWrapper onBack={() => setStep(1)} />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* BGM - AnimatePresenceの外に配置して常に存在させる */}
      <audio ref={bgmAudioRef} src="assets/夢の小舟.mp3" preload="auto" loop />
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
