import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { insertLineBreaks } from '../utils/emaUtils';
import { useEmaImageSize } from '../hooks/useEmaImageSize';

const INITIAL_DISPLAY_COUNT = 20;
const LOAD_MORE_COUNT = 20;

export const AllEmas = ({
  emas,
  sortByLikes,
  setSortByLikes,
  handleViewMyEmaClick,
  handleRestartClick,
  likedSet,
  setLikedSet,
  saveLikesToStorage,
  setEmas,
  expandedEma,
  setExpandedEma,
  isMobile
}) => {
  const [screenAspectRatio, setScreenAspectRatio] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth / window.innerHeight;
    }
    return 1;
  });
  const [screenWidth, setScreenWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 0;
  });

  // 画面のアスペクト比と幅を監視（iPad判定用）
  useEffect(() => {
    const updateScreenSize = () => {
      if (typeof window !== 'undefined') {
        setScreenWidth(window.innerWidth);
        setScreenAspectRatio(window.innerWidth / window.innerHeight);
      }
    };
    
    window.addEventListener('resize', updateScreenSize);
    updateScreenSize();
    
    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  }, []);

  // タブレット判定: iPad mini, Air, Proなど
  const isTablet = !isMobile && screenWidth >= 640 && screenWidth < 1400 && screenAspectRatio <= 0.85;

  const allEmaList = [...emas].sort((a, b) => {
    if (sortByLikes) {
      return (b.likes || 0) - (a.likes || 0);
    } else {
      return (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0);
    }
  });

  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  // 並び替えや絵馬データが変更されたら表示数をリセット
  useEffect(() => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  }, [sortByLikes, emas.length]);

  const displayedEmas = allEmaList.slice(0, displayCount);
  const hasMore = allEmaList.length > displayCount;

  // いいねボタンのハンドラ
  const handleLike = async (id) => {
    if (likedSet.has(id)) return;
    try {
      const emaRef = doc(db, 'emas', id);
      await updateDoc(emaRef, { likes: increment(1) });
      setLikedSet(new Set([...likedSet, id]));
      saveLikesToStorage(new Set([...likedSet, id]));
      setEmas(prevEmas =>
        prevEmas.map(ema =>
          ema.id === id ? { ...ema, likes: (ema.likes || 0) + 1 } : ema
        )
      );
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
        <h1 className="text-3xl font-bold text-center text-white/80 mb-8 drop-shadow-lg">
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
              onClick={handleRestartClick}
              className="custom-outline-btn mx-auto mb-2"
            >
              <span className="btn-label-highlight">もう一度お参りをする</span>
              <span className="btn-arrow-highlight">&gt;</span>
            </button>
          </div>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isTablet ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-x-4 gap-y-0.05 max-w-7xl mx-auto`}>
          {allEmaList.length === 0 ? (
            <div className={`${isTablet ? 'col-span-2' : 'col-span-4'} text-center text-white text-xl py-8`}>
              まだ絵馬が投稿されていません。<br />
              最初の絵馬を書いてみませんか？
            </div>
          ) : (
            <>
              {displayedEmas.map((ema) => (
                <EmaListCard
                  key={ema.id}
                  ema={ema}
                  isMobile={isMobile}
                  setExpandedEma={setExpandedEma}
                  handleLike={handleLike}
                  likedSet={likedSet}
                />
              ))}
            </>
          )}
        </div>
        {hasMore && (
          <div className="flex justify-center mt-6 mb-4">
            <button
              onClick={() => setDisplayCount(prev => prev + LOAD_MORE_COUNT)}
              className="px-6 py-3 bg-white/80 hover:bg-white text-gray-800 font-bold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              さらに表示する ({allEmaList.length - displayCount}件)
            </button>
          </div>
        )}
      </div>
      {/* 拡大表示モーダル */}
      <ExpandedEmaModal
        expandedEma={expandedEma}
        setExpandedEma={setExpandedEma}
        isMobile={isMobile}
      />
    </motion.div>
  );
};

const EmaListCard = ({ ema, isMobile, setExpandedEma, handleLike, likedSet }) => {
  const emaImageRef = useRef(null);
  const emaImageSize = useEmaImageSize(emaImageRef, 7);
  const [characterImageAspectRatio, setCharacterImageAspectRatio] = useState(null);
  const [characterImageLoaded, setCharacterImageLoaded] = useState(false);
  const [emaImageLoaded, setEmaImageLoaded] = useState(false);
  const [screenAspectRatio, setScreenAspectRatio] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth / window.innerHeight;
    }
    return 1;
  });
  const [screenWidth, setScreenWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 0;
  });

  const characterImageRef = useRef(null);

  // 画面のアスペクト比と幅を監視（iPad判定用）
  useEffect(() => {
    const updateScreenSize = () => {
      if (typeof window !== 'undefined') {
        setScreenWidth(window.innerWidth);
        setScreenAspectRatio(window.innerWidth / window.innerHeight);
      }
    };
    
    window.addEventListener('resize', updateScreenSize);
    updateScreenSize();
    
    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  }, []);

  // デバイスタイプの判定: スマホ / タブレット（iPad） / デスクトップ
  // iPad Pro 12.9インチ（1024px）まで対応するため、画面幅の上限を1400pxに設定
  const isTablet = !isMobile && screenWidth >= 640 && screenWidth < 1400 && screenAspectRatio <= 0.85;
  const isDesktop = !isMobile && !isTablet;

  useEffect(() => {
    setCharacterImageAspectRatio(null);
    setCharacterImageLoaded(false);
    
    // キャラクター画像が既に読み込まれている場合（キャッシュなど）をチェック
    // 少し遅延させて、refが設定された後にチェック
    const checkImageLoaded = setTimeout(() => {
      if (characterImageRef.current?.complete) {
        const img = characterImageRef.current;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const aspectRatio = img.naturalHeight / img.naturalWidth;
          setCharacterImageAspectRatio(aspectRatio > 1);
          setCharacterImageLoaded(true);
        }
      }
    }, 100);
    
    return () => clearTimeout(checkImageLoaded);
  }, [ema.character?.id]);

  // 画像読み込みタイムアウト: 3秒後に表示を試みる
  useEffect(() => {
    if (!characterImageLoaded && ema.character) {
      const timer = setTimeout(() => {
        if (!characterImageLoaded && characterImageRef.current) {
          const img = characterImageRef.current;
          if (img.complete && img.naturalWidth > 0) {
            const aspectRatio = img.naturalHeight / img.naturalWidth;
            setCharacterImageAspectRatio(aspectRatio > 1);
            setCharacterImageLoaded(true);
          } else {
            // タイムアウト後も読み込まれていない場合は表示を試みる
            setCharacterImageLoaded(true);
          }
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [characterImageLoaded, ema.character?.id]);

  useEffect(() => {
    if (emaImageRef.current?.complete) {
      setEmaImageLoaded(true);
    }
  }, []);

  const getWishFontSize = () => {
    if (emaImageSize.width === 0) {
      if (isMobile) return '0.95rem';
      if (isTablet) return '0.98rem';
      return '1rem';
    }
    let baseSize, maxSize;
    if (isMobile) {
      baseSize = emaImageSize.width * 0.038;
      maxSize = 24;
    } else if (isTablet) {
      baseSize = emaImageSize.width * 0.04;
      maxSize = 26;
    } else {
      baseSize = emaImageSize.width * 0.042;
      maxSize = 28;
    }
    return `${Math.max(10, Math.min(baseSize, maxSize))}px`;
  };

  const getNameFontSize = () => {
    if (emaImageSize.width === 0) {
      if (isMobile) return '0.9rem';
      if (isTablet) return '0.93rem';
      return '0.95rem';
    }
    let baseSize, maxSize;
    if (isMobile) {
      baseSize = emaImageSize.width * 0.028;
      maxSize = 28;
    } else if (isTablet) {
      baseSize = emaImageSize.width * 0.029;
      maxSize = 26;
    } else {
      baseSize = emaImageSize.width * 0.03;
      maxSize = 24;
    }
    return `${Math.max(10, Math.min(baseSize, maxSize))}px`;
  };

  // キャラクター画像コンテナのレイアウトを縦横比ごとに切り替え
  const getCharacterContainerStyle = () => {
    const isPortrait = characterImageAspectRatio === true;
    const isLandscape = characterImageAspectRatio === false;

    if (isMobile) {
      // スマホ用（既存の配置を維持）
      if (isPortrait) {
        // モバイル: 縦長キャラ画像
        return {
          bottom: '22%',
          right: '8%',
          width: '36%',
          height: '39%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 0
        };
      } else if (isLandscape) {
        // モバイル: 横長キャラ画像
        return {
          bottom: '22%',
          right: '7%',
          width: '44%',
          height: '29%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 0
        };
      }
      return {
        bottom: '24%',
        right: '14%',
        width: '32%',
        height: '35%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexShrink: 0
      };
    } else if (isTablet) {
      // タブレット（iPad縦向きなど）用
      if (isPortrait) {
        // タブレット: 縦長キャラ画像
        return {
          bottom: '22%',
          right: '11%',
          width: '30%',
          height: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 0
        };
      } else if (isLandscape) {
        // タブレット: 横長キャラ画像
        return {
          bottom: '22%',
          right: '7%',
          width: '38%',
          height: '35%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 0
        };
      }
      return {
        bottom: '10%',
        right: '9%',
        width: '30%',
        height: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexShrink: 0
      };
    } else {
      // デスクトップ用（既存の配置を維持）
      if (isPortrait) {
        // デスクトップ: 縦長キャラ画像
        return {
          bottom: '23%',
          right: '12%',
          width: '25%',
          height: '60%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 0
        };
      } else if (isLandscape) {
        // デスクトップ: 横長キャラ画像
        return {
          bottom: '23%',
          right: '10%',
          width: '35%',
          height: '40%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          flexShrink: 0
        };
      }
      return {
        bottom: '18%',
        right: '23%',
        width: '25%',
        height: '60%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexShrink: 0
      };
    }
  };

  return (
    <div
      className="relative transform hover:scale-105 transition-transform duration-300 bg-transparent cursor-pointer"
      onClick={() => setExpandedEma(ema)}
      style={{
        aspectRatio: '0.9'
      }}
    >
      <img
        ref={emaImageRef}
        src="assets/ema-transparent.png"
        alt="絵馬"
        className="w-full h-full object-contain rounded-md bg-transparent"
        style={{ 
          backgroundColor: 'transparent',
          willChange: 'transform',
          transform: 'translateZ(0)'
        }}
        loading="eager"
        onLoad={() => setEmaImageLoaded(true)}
      />
      {emaImageSize.width > 0 && emaImageLoaded && (
        <div className="absolute inset-0 p-4 pointer-events-none">
          {/* 願い事テキスト領域 */}
          <div
            className="absolute z-10"
            style={{
              top: isMobile ? '52%' : isTablet ? '53%' : '53%',
              left: '50%',
              transform: 'translate(-50%, -50%) translateZ(0)',
              width: isMobile ? '72%' : isTablet ? '73%' : '75%',
              height: '28%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              willChange: 'transform'
            }}
          >
            <p
              className="text-black font-handwriting"
              style={{
                fontSize: getWishFontSize(),
                textAlign: 'center',
                whiteSpace: 'pre-wrap',
                fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                margin: 0,
                padding: 0,
                width: '100%'
              }}
            >
              {insertLineBreaks(ema.wish)}
            </p>
          </div>
          {/* 名前テキスト領域 */}
          <div
            className="absolute z-10"
            style={{
              bottom: isMobile ? '25%' : isTablet ? '26%' : '26%',
              right: isMobile ? '30%' : isTablet ? '34%' : '38%',
              width: isMobile ? '55%' : isTablet ? '50%' : '45%',
              height: '6%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              flexShrink: 0,
              willChange: 'transform',
              transform: 'translateZ(0)'
            }}
          >
            <p
              className="text-black font-handwriting"
              style={{
                fontSize: getNameFontSize(),
                fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                margin: 0,
                padding: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: ema.name.length > 10 ? 'ellipsis' : 'clip',
                width: '100%',
                textAlign: 'left'
              }}
            >
              {ema.name}
            </p>
          </div>
          {/* キャラクター画像領域 */}
          {ema.character && (
            <div 
              className="absolute z-0" 
              style={{
                ...getCharacterContainerStyle(),
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
            >
              <img
                ref={characterImageRef}
                src={ema.character.image_path}
                alt={ema.character.name}
                style={{
                  width: '80%',
                  height: 'auto',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: characterImageLoaded ? 'block' : 'none',
                  willChange: 'transform',
                  transform: 'translateZ(0)'
                }}
                loading="lazy"
                onLoad={(e) => {
                  const img = e.target;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    const aspectRatio = img.naturalHeight / img.naturalWidth;
                    setCharacterImageAspectRatio(aspectRatio > 1);
                    setCharacterImageLoaded(true);
                  } else {
                    // 画像サイズが取得できない場合でも表示
                    setCharacterImageLoaded(true);
                  }
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  setCharacterImageLoaded(true);
                }}
              />
            </div>
          )}
          {/* いいねボタン（全デバイス共通でカード内に配置） */}
          <button
            type="button"
            className="absolute flex items-center gap-1 px-2 py-1 rounded-full bg-white bg-opacity-80 shadow text-pink-600 text-sm font-bold pointer-events-auto hover:bg-pink-100 transition z-20"
            style={{ 
              bottom: isMobile ? '12%' : isTablet ? '24%' : '24%', 
              left: isMobile ? '50%' : isTablet ? '1%' : '0.1%',
              transform: isMobile ? 'translateX(-50%)' : 'none'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleLike(ema.id);
            }}
            disabled={likedSet.has(ema.id)}
            aria-label="いいね"
          >
            <span role="img" aria-label="like">
              ❤️
            </span>
            {ema.likes || 0}
          </button>
        </div>
      )}
    </div>
  );
};

// 拡大表示モーダルコンポーネント
const ExpandedEmaModal = ({ expandedEma, setExpandedEma, isMobile }) => {
  const emaImageRef = useRef(null);
  const modalContainerRef = useRef(null);
  const characterImageRef = useRef(null);
  // 拡大表示モーダルの場合はstepを7に設定（6以上であれば動作する）
  const emaImageSize = useEmaImageSize(emaImageRef, expandedEma ? 7 : 0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [characterImageAspectRatio, setCharacterImageAspectRatio] = useState(null); // null: 未判定, true: 縦長, false: 横長
  const [characterImageLoaded, setCharacterImageLoaded] = useState(false);
  const [emaImageLoaded, setEmaImageLoaded] = useState(false);
  const [screenAspectRatio, setScreenAspectRatio] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth / window.innerHeight;
    }
    return 1;
  });
  const [screenWidth, setScreenWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 0;
  });

  // 画面のアスペクト比と幅を監視（iPad判定用）
  useEffect(() => {
    const updateScreenSize = () => {
      if (typeof window !== 'undefined') {
        setScreenWidth(window.innerWidth);
        setScreenAspectRatio(window.innerWidth / window.innerHeight);
      }
    };
    
    window.addEventListener('resize', updateScreenSize);
    updateScreenSize();
    
    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  }, []);

  // デバイスタイプの判定: スマホ / タブレット（iPad） / デスクトップ
  // 画面幅とアスペクト比の両方を考慮して判定
  // タブレット判定: 640px以上1024px未満で、アスペクト比が0.8以下（iPad mini、iPad Airなど）
  const isTablet = !isMobile && screenWidth >= 640 && screenWidth < 1024 && screenAspectRatio <= 0.8;
  // デスクトップ判定: それ以外の非モバイル（横長画面）
  const isDesktop = !isMobile && !isTablet;

  // 拡大表示する絵馬が変更された時にアスペクト比をリセット
  useEffect(() => {
    setCharacterImageAspectRatio(null);
    setCharacterImageLoaded(false);
    setEmaImageLoaded(false);
    
    // キャラクター画像が既に読み込まれている場合（キャッシュなど）をチェック
    // 少し遅延させて、refが設定された後にチェック
    const checkImageLoaded = setTimeout(() => {
      if (characterImageRef.current?.complete) {
        const img = characterImageRef.current;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const aspectRatio = img.naturalHeight / img.naturalWidth;
          setCharacterImageAspectRatio(aspectRatio > 1);
          setCharacterImageLoaded(true);
        }
      }
    }, 100);
    
    return () => clearTimeout(checkImageLoaded);
  }, [expandedEma?.character?.id, expandedEma?.id]);

  // 画像読み込みタイムアウト: 3秒後に表示を試みる
  useEffect(() => {
    if (!characterImageLoaded && expandedEma?.character) {
      const timer = setTimeout(() => {
        if (!characterImageLoaded && characterImageRef.current) {
          const img = characterImageRef.current;
          if (img.complete && img.naturalWidth > 0) {
            const aspectRatio = img.naturalHeight / img.naturalWidth;
            setCharacterImageAspectRatio(aspectRatio > 1);
            setCharacterImageLoaded(true);
          } else {
            // タイムアウト後も読み込まれていない場合は表示を試みる
            setCharacterImageLoaded(true);
          }
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [characterImageLoaded, expandedEma?.character?.id]);

  useEffect(() => {
    if (emaImageRef.current?.complete) {
      setEmaImageLoaded(true);
    }
  }, [expandedEma]);

  // モーダルが開いた時やリサイズ時に画像サイズを再計算
  useEffect(() => {
    if (expandedEma && emaImageRef.current) {
      const updateSize = () => {
        setTimeout(() => {
          if (emaImageRef.current) {
            const rect = emaImageRef.current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              setForceUpdate(prev => prev + 1);
            }
          }
        }, 100);
      };
      
      updateSize();
      window.addEventListener('resize', updateSize);
      
      return () => {
        window.removeEventListener('resize', updateSize);
      };
    }
  }, [expandedEma]);

  // 絵馬画像のサイズに基づいてフォントサイズを計算（自分の絵馬画面と同じロジック）
  const getWishFontSize = () => {
    if (emaImageSize.width === 0) return '1rem';
    // 自分の絵馬より一段大きく表示して読みやすさを確保
    let baseSize, maxSize;
    if (isMobile) {
      baseSize = emaImageSize.width * 0.042;
      maxSize = 36;
    } else if (isTablet) {
      baseSize = emaImageSize.width * 0.041;
      maxSize = 40;
    } else {
      baseSize = emaImageSize.width * 0.04;
      maxSize = 44;
    }
    return `${Math.max(12, Math.min(baseSize, maxSize))}px`;
  };

  const getNameFontSize = () => {
    if (emaImageSize.width === 0) return '1rem';
    // 拡大表示では名前も一段階大きくする
    let baseSize, maxSize;
    if (isMobile) {
      baseSize = emaImageSize.width * 0.035;
      maxSize = 52;
    } else if (isTablet) {
      baseSize = emaImageSize.width * 0.031;
      maxSize = 42;
    } else {
      baseSize = emaImageSize.width * 0.028;
      maxSize = 38;
    }
    return `${Math.max(12, Math.min(baseSize, maxSize))}px`;
  };

  return (
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
          ref={modalContainerRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 絵馬画像を中央に配置するコンテナ（拡大表示専用の透明絵馬を使用） */}
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <img 
              ref={emaImageRef}
              src="assets/ema-transparent.png" 
              alt="絵馬" 
              className="max-w-full max-h-full w-auto h-auto"
              style={{ 
                objectFit: 'contain',
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
              loading="eager"
              onLoad={() => setEmaImageLoaded(true)}
            />
          </div>

          {/* 絵馬画像の上に要素を配置するコンテナ（絵馬画像と同じサイズ・位置） */}
          {emaImageSize.width > 0 && emaImageSize.height > 0 && emaImageLoaded && (
            <div 
              className="absolute z-10 pointer-events-none"
              style={{
                left: `${emaImageSize.left}px`,
                top: `${emaImageSize.top}px`,
                width: `${emaImageSize.width}px`,
                height: `${emaImageSize.height}px`
              }}
            >
              {/* 願い事用の透明コンテナ（自分の絵馬画面と同じロジック） */}
              <div
                className="absolute"
                style={{
                  ...(isMobile
                    ? {
                        // スマホ用（既存の配置を維持）
                        top: '43%',
                        left: '44%',
                        transform: 'translate(-50%, -50%) translateZ(0)',
                        width: '70%',
                        height: '28%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }
                    : isTablet
                    ? {
                        // タブレット（iPad縦向きなど）用
                        top: '44%',
                        left: '45%',
                        transform: 'translate(-50%, -50%) translateZ(0)',
                        width: '55%',
                        height: '29%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }
                    : {
                        // デスクトップ用（既存の配置を維持）
                        top: '48%',
                        left: '37%',
                        transform: 'translate(-50%, -50%) translateZ(0)',
                        width: '41.67%',
                        height: '30%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }),
                  zIndex: 20,
                  willChange: 'transform'
                }}
              >
                <p
                  className="text-black font-handwriting"
                  style={{
                    fontSize: getWishFontSize(),
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                    fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                    textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                    margin: 0,
                    padding: 0,
                    width: '100%'
                  }}
                >
                  {insertLineBreaks(expandedEma.wish)}
                </p>
              </div>

              {/* 名前用の透明コンテナ（自分の絵馬画面と同じロジック） */}
              <div
                className="absolute"
                style={{
                  ...(isMobile
                    ? {
                        // スマホ用（既存の配置を維持）
                        bottom: '35%',
                        right: '34%',
                        width: '60%',
                        height: '6%',
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0
                      }
                    : isTablet
                    ? {
                        // タブレット（iPad縦向きなど）用
                        bottom: '30%',
                        right: '47%',
                        width: '45%',
                        height: '6%',
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0
                      }
                    : {
                        // デスクトップ用（既存の配置を維持）
                        bottom: '25%',
                        right: '70%',
                        width: '28%',
                        height: '5%',
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0
                      }),
                  zIndex: 20,
                  willChange: 'transform',
                  transform: 'translateZ(0)'
                }}
              >
                <p
                  className="text-black font-handwriting"
                  style={{
                    fontSize: getNameFontSize(),
                    fontFamily: '"Klee One", "Hina Mincho", "Noto Sans JP", cursive',
                    textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                    margin: 0,
                    padding: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    textOverflow: 'clip',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  {expandedEma.name}
                </p>
              </div>

              {/* キャラクター画像用の透明コンテナ */}
              {expandedEma.character && (
                <div
                  className="absolute"
                  style={{
                    ...(() => {
                    // 縦長画像と横長画像で配置を分ける
                    const isPortrait = characterImageAspectRatio === true;
                    const isLandscape = characterImageAspectRatio === false;
                    
                    if (isMobile) {
                      // スマホ用（既存の配置を維持）
                      if (isPortrait) {
                        // 縦長画像用の配置
                        return {
                          bottom: '30%',
                          right: '12%',
                          width: '32%',
                          height: '35%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          flexShrink: 0
                        };
                      } else if (isLandscape) {
                        // 横長画像用の配置
                        return {
                          bottom: '30%',
                          right: '12%',
                          width: '40%',
                          height: '25%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          flexShrink: 0
                        };
                      } else {
                        // 未判定時はデフォルト（縦長想定）
                        return {
                          bottom: '24%',
                          right: '14%',
                          width: '32%',
                          height: '35%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          flexShrink: 0
                        };
                      }
                    } else if (isTablet) {
                      // タブレット（iPad縦向きなど）用
                      if (isPortrait) {
                        // 縦長画像用の配置
                        return {
                          bottom: '28%',
                          right: '16%',
                          width: '30%',
                          height: '45%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          flexShrink: 0
                        };
                      } else if (isLandscape) {
                        // 横長画像用の配置
                        return {
                          bottom: '28%',
                          right: '14%',
                          width: '38%',
                          height: '32%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          flexShrink: 0
                        };
                      } else {
                        // 未判定時はデフォルト（縦長想定）
                        return {
                          bottom: '28%',
                          right: '16%',
                          width: '30%',
                          height: '45%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          flexShrink: 0
                        };
                      }
                    } else {
                      // デスクトップ用（既存の配置を維持）
                      if (isPortrait) {
                        // 縦長画像用の配置
                        return {
                          bottom: '22%',
                          right: '21%',
                          width: '28%',
                          height: '63%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          flexShrink: 0
                        };
                      } else if (isLandscape) {
                        // 横長画像用の配置
                        return {
                          bottom: '22%',
                          right: '18%',
                          width: '43%',
                          height: '48%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          flexShrink: 0
                        };
                      } else {
                        // 未判定時はデフォルト（縦長想定）
                        return {
                          bottom: '18%',
                          right: '23%',
                          width: '25%',
                          height: '60%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          flexShrink: 0
                        };
                      }
                    }
                  })(),
                  zIndex: 10,
                  willChange: 'transform',
                  transform: 'translateZ(0)'
                }}
                >
                  <img
                    ref={characterImageRef}
                    src={expandedEma.character.image_path}
                    alt={expandedEma.character.name}
                    style={{
                      width: '80%',
                      height: 'auto',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      display: characterImageLoaded ? 'block' : 'none',
                      willChange: 'transform',
                      transform: 'translateZ(0)'
                    }}
                    loading="eager"
                    onLoad={(e) => {
                      // 画像のアスペクト比を判定
                      const img = e.target;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        const aspectRatio = img.naturalHeight / img.naturalWidth;
                        setCharacterImageAspectRatio(aspectRatio > 1); // true: 縦長, false: 横長
                        setCharacterImageLoaded(true);
                      } else {
                        // 画像サイズが取得できない場合でも表示
                        setCharacterImageLoaded(true);
                      }
                    }}
                    onError={(e) => {
                      e.target.src = 'new-png-assets2/01_そらねなご.png';
                      setCharacterImageLoaded(true);
                    }}
                  />
                </div>
              )}
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
  );
};

