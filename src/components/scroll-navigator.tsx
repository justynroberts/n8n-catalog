'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export function ScrollNavigator() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const updateScrollInfo = useCallback(() => {
    const currentScrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    
    setIsVisible(currentScrollY > 300);
    setScrollProgress(docHeight > 0 ? Math.round((currentScrollY / docHeight) * 100) : 0);
    setIsAtTop(currentScrollY < 100);
    setIsAtBottom(currentScrollY > (docHeight - 100));
  }, []);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateScrollInfo();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateScrollInfo(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateScrollInfo]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({ 
      top: document.documentElement.scrollHeight,
      behavior: 'smooth' 
    });
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center space-y-3">
      {/* Simple Progress Indicator */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gray-800/80 border border-gray-600/50 flex items-center justify-center backdrop-blur-sm">
          <span className="text-xs font-medium text-white">
            {scrollProgress}%
          </span>
        </div>
        {/* Progress Ring */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-blue-500/30"
          style={{
            background: `conic-gradient(from 0deg, #3b82f6 ${scrollProgress * 3.6}deg, transparent 0deg)`
          }}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col space-y-2">
        {/* Scroll to Top */}
        <button
          onClick={scrollToTop}
          disabled={isAtTop}
          className={`rounded-full p-2.5 transition-colors duration-200 ${
            isAtTop 
              ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700'
          }`}
          title="Go to Top"
        >
          <ArrowUp size={18} />
        </button>

        {/* Scroll to Bottom */}
        <button
          onClick={scrollToBottom}
          disabled={isAtBottom}
          className={`rounded-full p-2.5 transition-colors duration-200 ${
            isAtBottom 
              ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' 
              : 'bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-700'
          }`}
          title="Go to Bottom"
        >
          <ArrowDown size={18} />
        </button>
      </div>
    </div>
  );
}