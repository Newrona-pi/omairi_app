import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmaImageSize } from '../hooks/useEmaImageSize';
import { insertLineBreaks } from '../utils/emaUtils';

export const EmaDisplay = ({
  displayWish,
  displayName,
  selectedCharacter,
  showButtons,
  handleMyEmaBackgroundClick,
  handleEmaClick,
  handleBackToCharacterSelection,
  isMobile,
  emaImageRef
}) => {
  const emaImageSize = useEmaImageSize(emaImageRef, 6);
  const [characterImageAspectRatio, setCharacterImageAspectRatio] = useState(null); // null: 未判定, true: 縦長, false: 横長

  // キャラクターが変更された時にアスペクト比をリセット
  useEffect(() => {
    setCharacterImageAspectRatio(null);
  }, [selectedCharacter?.id]);

  const buttonContainerStyle = isMobile
    ? {
        bottom: '10%',
        left: '18%',
        transform: 'translateX(-50%)',
        width: '65%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        alignItems: 'stretch'
      }
    : {
        top: '15%',
        right: '5%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'stretch',
        width: 'auto',
        minWidth: '220px'
      };

  const purchaseButtonStyle = isMobile
    ? {
        top: '5%',
        left: '38%',
        transform: 'translateX(-50%)',
        width: '60%',
        display: 'flex',
        justifyContent: 'center'
      }
    : {
        top: '5%',
        right: '5%',
        display: 'flex',
        justifyContent: 'flex-end'
      };

  const buttonClassName = `custom-outline-btn${isMobile ? ' w-full text-base' : ''}`;

  // 絵馬画像のサイズに基づいてフォントサイズを計算
  const getWishFontSize = () => {
    if (emaImageSize.width === 0) return '1rem';
    // 絵馬画像の幅に対して相対的に計算（スマホ: 約2.6%, デスクトップ: 約3.2%）
    const baseSize = isMobile ? emaImageSize.width * 0.026 : emaImageSize.width * 0.032;
    // 最小値と最大値を設定
    return `${Math.max(12, Math.min(baseSize, isMobile ? 32 : 40))}px`;
  };

  const getNameFontSize = () => {
    if (emaImageSize.width === 0) return '1rem';
    // 絵馬画像の幅に対して相対的に計算（スマホ: 約6%, デスクトップ: 約3%）
    const baseSize = isMobile ? emaImageSize.width * 0.03 : emaImageSize.width * 0.022;
    // 最小値と最大値を設定
    return `${Math.max(12, Math.min(baseSize, isMobile ? 48 : 35))}px`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className={`fixed inset-0 w-screen h-screen ${isMobile ? 'overflow-y-auto' : 'overflow-hidden'}`}
      onClick={handleMyEmaBackgroundClick}
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
      {/* 絵馬画像を中央に配置するコンテナ */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <img 
          ref={emaImageRef}
          src={isMobile ? "assets/ema-portrait.png" : "assets/ema1105-2.png"} 
          alt="Ema" 
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
          {/* 願い事用の透明コンテナ */}
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
                    top: '55%',
                    left: '50%',
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
              {insertLineBreaks(displayWish)}
            </p>
          </div>

          {/* 名前用の透明コンテナ */}
          <div
            className="absolute"
            style={{
              ...(isMobile
                ? {
                    bottom: '25%',
                    right: '24%',
                    width: '55%',
                    height: '6%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    flexShrink: 0
                  }
                : {
                    bottom: '20%',
                    right: '52%',
                    width: '23%',
                    height: '5%',
                    overflow: 'hidden',
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
                overflow: 'hidden',
                textOverflow: displayName.length > 10 ? 'ellipsis' : 'clip',
                width: '100%',
                textAlign: 'left'
              }}
            >
              {displayName}
            </p>
          </div>

          {/* キャラクター画像用の透明コンテナ */}
          {selectedCharacter && (
            <div
              className="absolute"
              style={{
                ...(() => {
                // 縦長画像と横長画像で配置を分ける
                const isPortrait = characterImageAspectRatio === true;
                const isLandscape = characterImageAspectRatio === false;
                
                if (isMobile) {
                  if (isPortrait) {
                    // 縦長画像用の配置
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
                    // 横長画像用の配置
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
                    // 縦長画像用の配置
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
                  } else if (isLandscape) {
                    // 横長画像用の配置
                    return {
                      bottom: '15%',
                      right: '21.5%',
                      width: '35%',
                      height: '40%',
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
                src={selectedCharacter.image_path}
                alt={selectedCharacter.name}
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
              />
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showButtons && (
          <>
            {/* 絵馬の購入はこちらからボタン（画面上部） */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute z-10 button-container"
              style={purchaseButtonStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={selectedCharacter?.purchase_url || 'https://newrona.jp/melofinity'}
                target="_blank"
                rel="noopener noreferrer"
                className="purchase-btn"
              >
                <span className="purchase-btn-label">絵馬の購入はこちら</span>
                <span className="purchase-btn-icon">
                  <span className="purchase-btn-arrow">▶</span>
                </span>
              </a>
            </motion.div>
            {/* 推しの選択に戻る・みんなの絵馬を見るボタン（中央寄り） */}
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
                onClick={handleBackToCharacterSelection}
                className={buttonClassName}
              >
                <span className="btn-label-highlight">推しの選択に戻る</span>
                <span className="btn-arrow-highlight">&lt;</span>
              </button>
              <button
                onClick={handleEmaClick}
                className={buttonClassName}
              >
                <span className="btn-label-highlight">みんなの絵馬を見る</span>
                <span className="btn-arrow-highlight">&gt;</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

