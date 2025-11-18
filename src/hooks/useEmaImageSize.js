import { useState, useEffect } from 'react';

// 絵馬画像のサイズと位置を取得するカスタムフック
export const useEmaImageSize = (emaImageRef, step) => {
  const [emaImageSize, setEmaImageSize] = useState({ width: 0, height: 0, left: 0, top: 0 });

  useEffect(() => {
    // stepが6以上（自分の絵馬画面または拡大表示モーダル）の場合にサイズを取得
    if (step >= 6 && emaImageRef.current) {
      const updateEmaImageSize = () => {
        const img = emaImageRef.current;
        if (img) {
          // 少し待ってからサイズを取得（レイアウトが確定してから）
          setTimeout(() => {
            const rect = img.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              setEmaImageSize({
                width: rect.width,
                height: rect.height,
                left: rect.left,
                top: rect.top
              });
            }
          }, 10);
        }
      };
      
      // 画像が読み込まれた後にサイズを取得
      if (emaImageRef.current.complete) {
        updateEmaImageSize();
      } else {
        emaImageRef.current.addEventListener('load', updateEmaImageSize);
      }
      
      // リサイズ時にも更新
      window.addEventListener('resize', updateEmaImageSize);
      
      // 初回のサイズ取得
      updateEmaImageSize();
      
      return () => {
        window.removeEventListener('resize', updateEmaImageSize);
        if (emaImageRef.current) {
          emaImageRef.current.removeEventListener('load', updateEmaImageSize);
        }
      };
    } else if (step < 6) {
      // stepが6未満の場合はサイズをリセット
      setEmaImageSize({ width: 0, height: 0, left: 0, top: 0 });
    }
  }, [step, emaImageRef]);

  return emaImageSize;
};

