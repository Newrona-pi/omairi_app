import { useState, useEffect } from 'react';

// スマホ判定用カスタムフック
export const useMobile = () => {
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

  return isMobile;
};

