import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { insertLineBreaks } from '../utils/emaUtils';
import { useEmaImageSize } from '../hooks/useEmaImageSize';

export const AllEmas = ({
  emas,
  sortByLikes,
  setSortByLikes,
  handleViewMyEmaClick,
  handleRestartClick,
  likedSet,
  setLikedSet,
  saveLikesToStorage,
  fetchEmas,
  expandedEma,
  setExpandedEma,
  isMobile
}) => {
  const allEmaList = [...emas].sort((a, b) => {
    if (sortByLikes) {
      return (b.likes || 0) - (a.likes || 0);
    } else {
      return (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0);
    }
  });

  // いいねボタンのハンドラ
  const handleLike = async (id) => {
    if (likedSet.has(id)) return;
    try {
      const emaRef = doc(db, 'emas', id);
      console.log('like update: id', id, 'emaRef.path', emaRef.path);
      await updateDoc(emaRef, { likes: increment(1) });
      setLikedSet(new Set([...likedSet, id]));
      saveLikesToStorage(new Set([...likedSet, id]));
      await fetchEmas();
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {allEmaList.length === 0 ? (
            <div className="col-span-4 text-center text-white text-xl py-8">
              まだ絵馬が投稿されていません。<br />
              最初の絵馬を書いてみませんか？
            </div>
          ) : (
            allEmaList.map((ema) => (
              <EmaListCard
                key={ema.id}
                ema={ema}
                isMobile={isMobile}
                setExpandedEma={setExpandedEma}
                handleLike={handleLike}
                likedSet={likedSet}
              />
            ))
          )}
        </div>
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

  useEffect(() => {
    setCharacterImageAspectRatio(null);
  }, [ema.character?.id]);

  const getWishFontSize = () => {
    if (emaImageSize.width === 0) return isMobile ? '0.95rem' : '1rem';
    const baseSize = isMobile ? emaImageSize.width * 0.038 : emaImageSize.width * 0.042;
    return `${Math.max(10, Math.min(baseSize, isMobile ? 24 : 28))}px`;
  };

  const getNameFontSize = () => {
    if (emaImageSize.width === 0) return isMobile ? '0.9rem' : '0.95rem';
    const baseSize = isMobile ? emaImageSize.width * 0.028 : emaImageSize.width * 0.03;
    return `${Math.max(10, Math.min(baseSize, isMobile ? 28 : 24))}px`;
  };

  // キャラクター画像コンテナのレイアウトを縦横比ごとに切り替え
  const getCharacterContainerStyle = () => {
    const isPortrait = characterImageAspectRatio === true;
    const isLandscape = characterImageAspectRatio === false;

    if (isMobile) {
      if (isPortrait) {
        // モバイル: 縦長キャラ画像
        return {
          bottom: '18%',
          right: '7%',
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
          bottom: '18%',
          right: '5%',
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
    } else {
      if (isPortrait) {
        // デスクトップ: 縦長キャラ画像
        return {
          bottom: '1%',
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
          bottom: '2%',
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
    >
      <img
        ref={emaImageRef}
        src="assets/ema-transparent.png"
        alt="絵馬"
        className="w-full h-48 object-cover rounded-md bg-transparent"
        style={{ backgroundColor: 'transparent' }}
      />
      {emaImageSize.width > 0 && (
        <div className="absolute inset-0 p-4 pointer-events-none">
          {/* 願い事テキスト領域 */}
          <div
            className="absolute z-10"
            style={{
              top: isMobile ? '47%' : '57%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '72%' : '75%',
              height: '28%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
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
              bottom: isMobile ? '23%' : '12%',
              right: isMobile ? '30%' : '38%',
              width: isMobile ? '55%' : '45%',
              height: '6%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              flexShrink: 0
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
            <div className="absolute z-0" style={getCharacterContainerStyle()}>
              <img
                src={ema.character.image_path}
                alt={ema.character.name}
                style={{
                  width: '80%',
                  height: 'auto',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onLoad={(e) => {
                  const img = e.target;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    const aspectRatio = img.naturalHeight / img.naturalWidth;
                    setCharacterImageAspectRatio(aspectRatio > 1);
                  }
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          {!isMobile && (
            <button
              type="button"
              className="absolute flex items-center gap-1 px-2 py-1 rounded-full bg-white bg-opacity-80 shadow text-pink-600 text-sm font-bold pointer-events-auto hover:bg-pink-100 transition"
              style={{ bottom: '8%', left: '0.1%' }}
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
          )}
        </div>
      )}
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
  // 拡大表示モーダルの場合はstepを7に設定（6以上であれば動作する）
  const emaImageSize = useEmaImageSize(emaImageRef, expandedEma ? 7 : 0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [characterImageAspectRatio, setCharacterImageAspectRatio] = useState(null); // null: 未判定, true: 縦長, false: 横長

  // 拡大表示する絵馬が変更された時にアスペクト比をリセット
  useEffect(() => {
    setCharacterImageAspectRatio(null);
  }, [expandedEma?.character?.id]);

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
    const baseSize = isMobile ? emaImageSize.width * 0.032 : emaImageSize.width * 0.04;
    return `${Math.max(12, Math.min(baseSize, isMobile ? 36 : 44))}px`;
  };

  const getNameFontSize = () => {
    if (emaImageSize.width === 0) return '1rem';
    // 拡大表示では名前も一段階大きくする
    const baseSize = isMobile ? emaImageSize.width * 0.035 : emaImageSize.width * 0.028;
    return `${Math.max(12, Math.min(baseSize, isMobile ? 52 : 38))}px`;
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
              style={{ objectFit: 'contain' }}
            />
          </div>

          {/* 絵馬画像の上に要素を配置するコンテナ（絵馬画像と同じサイズ・位置） */}
          {emaImageSize.width > 0 && emaImageSize.height > 0 && (
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
                        top: '61%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '70%',
                        height: '28%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }
                    : {
                        top: '48%',
                        left: '37%',
                        transform: 'translate(-50%, -50%)',
                        width: '41.67%',
                        height: '30%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }),
                  zIndex: 20
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
                        bottom: '25%',
                        right: '24%',
                        width: '60%',
                        height: '6%',
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0
                      }
                    : {
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
                  zIndex: 20
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
                      if (isPortrait) {
                        // 縦長画像用の配置（自分の絵馬画面と同じロジック）
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
                      } else if (isLandscape) {
                        // 横長画像用の配置（自分の絵馬画面と同じロジック）
                        return {
                          bottom: '24%',
                          right: '14%',
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
                    } else {
                      if (isPortrait) {
                        // 縦長画像用の配置（自分の絵馬画面と同じロジック）
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
                        // 横長画像用の配置（自分の絵馬画面と同じロジック）
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
                  zIndex: 10
                }}
                >
                  <img
                    src={expandedEma.character.image_path}
                    alt={expandedEma.character.name}
                    style={{
                      width: '80%',
                      height: 'auto',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                    onLoad={(e) => {
                      // 画像のアスペクト比を判定
                      const img = e.target;
                      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        const aspectRatio = img.naturalHeight / img.naturalWidth;
                        setCharacterImageAspectRatio(aspectRatio > 1); // true: 縦長, false: 横長
                      }
                    }}
                    onError={e => { e.target.src = 'new-png-assets2/01_そらねなご.png'; }}
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

