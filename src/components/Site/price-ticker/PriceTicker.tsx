"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';

interface PriceItem {
  title: string;
  price: string;
  change: number;
  changePercent: number;
  type: 'plus' | 'minus' | 'equal';
}

const PriceTicker: React.FC = () => {
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      // اضافه کردن timestamp برای جلوگیری از cache
      const timestamp = Date.now();
      const res = await fetch(`/api/v1/public/market-prices?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        if (data.enabled && data.items && data.items.length > 0) {
          // همیشه state را update کن برای real-time updates
          // حتی اگر داده‌ها یکسان باشند، update کن تا React re-render کند
          setPrices(data.items);
          console.log('🔄 Prices updated:', new Date().toLocaleTimeString(), data.items.length, 'items');
          
          // Update refresh interval if provided
          if (data.refresh_interval) {
            const newInterval = parseInt(data.refresh_interval) || 30;
            setRefreshInterval(prev => {
              // فقط اگر تغییر کرده باشد، update کن
              if (prev !== newInterval) {
                console.log('⏱️ Refresh interval updated:', newInterval, 'seconds');
                return newInterval;
              }
              return prev;
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching market prices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // اولین بار فوری fetch کن
    console.log('🚀 Price ticker initialized, refresh interval:', refreshInterval, 'seconds');
    fetchPrices();
    
    // Set up auto-refresh
    const setupInterval = () => {
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Set up new interval
      intervalRef.current = setInterval(() => {
        console.log('⏰ Fetching prices...', new Date().toLocaleTimeString());
        fetchPrices();
      }, refreshInterval * 1000);
    };
    
    setupInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshInterval, fetchPrices]);

  // تنظیم padding-top برای body وقتی تیکر فعال است
  useEffect(() => {
    if (enabled && !loading && prices.length > 0) {
      // Responsive padding based on screen size
      const updatePadding = () => {
        if (window.innerWidth < 640) {
          document.body.style.paddingTop = '40px';
        } else {
          document.body.style.paddingTop = '48px';
        }
      };
      updatePadding();
      window.addEventListener('resize', updatePadding);
      return () => {
        window.removeEventListener('resize', updatePadding);
        document.body.style.paddingTop = '0';
      };
    } else {
      document.body.style.paddingTop = '0';
    }
    
    return () => {
      document.body.style.paddingTop = '0';
    };
  }, [enabled, loading, prices.length]);

  if (!enabled || loading || prices.length === 0) {
    return null;
  }

  const getChangeColor = (type: 'plus' | 'minus' | 'equal') => {
    switch (type) {
      case 'plus':
        return 'text-green-500';
      case 'minus':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getChangeIcon = (type: 'plus' | 'minus' | 'equal') => {
    if (type === 'plus') {
      return (
        <svg width="12" height="10" viewBox="0 0 24 20" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Arrow Up">
          <title>Arrow Up</title>
          <path fillRule="evenodd" clipRule="evenodd" d="M12 0L24 20L0 20L12 0Z" fill="currentColor"></path>
        </svg>
      );
    } else if (type === 'minus') {
      return (
        <svg width="12" height="10" viewBox="0 0 24 20" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Arrow Down" role="img">
          <title>Arrow Down</title>
          <path fillRule="evenodd" clipRule="evenodd" d="M12 20L0 0L24 0L12 20Z" fill="currentColor"></path>
        </svg>
      );
    }
    return null;
  };

  // تکرار آیتم‌ها برای loop بی‌نهایت (حداقل 2 بار برای seamless)
  const duplicatedPrices = [...prices, ...prices];

  return (
    <div id="carousel_header" className="w-full bg-gray-900 text-white overflow-hidden fixed top-0 left-0 right-0 z-[60] h-10 sm:h-12">
      <div className="ticker-wrapper">
        <div className="ticker-content">
          {duplicatedPrices.map((item, index) => (
            <div
              key={`${item.title}-${item.price}-${item.changePercent}-${index}`}
              className={`ticker-item flex-shrink-0 flex items-center gap-2 sm:gap-3 md:gap-4 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border-l border-gray-700 ${
                item.type === 'plus' ? 'plus' : item.type === 'minus' ? 'minus' : ''
              }`}
            >
              <div className="title">
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{item.title}</span>
              </div>
              <div className="price">
                <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{item.price}</span>
              </div>
              <div className={`price-percentage ${getChangeColor(item.type)}`}>
                <div className="wrapper flex items-center gap-0.5 sm:gap-1">
                  <span className="text-[10px] sm:text-xs whitespace-nowrap">
                    {item.changePercent > 0 ? '+' : ''}
                    {item.changePercent.toFixed(2)} %
                  </span>
                  <span className="flex-shrink-0">{getChangeIcon(item.type)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .ticker-wrapper {
          width: 100%;
          overflow: hidden;
          position: relative;
          direction: ltr;
        }
        
        .ticker-wrapper::before,
        .ticker-wrapper::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 40px;
          z-index: 10;
          pointer-events: none;
        }
        
        @media (min-width: 640px) {
          .ticker-wrapper::before,
          .ticker-wrapper::after {
            width: 60px;
          }
        }
        
        @media (min-width: 1024px) {
          .ticker-wrapper::before,
          .ticker-wrapper::after {
            width: 80px;
          }
        }
        
        .ticker-wrapper::before {
          left: 0;
          background: linear-gradient(to right, rgba(17, 24, 39, 1), rgba(17, 24, 39, 0));
        }
        
        .ticker-wrapper::after {
          right: 0;
          background: linear-gradient(to left, rgba(17, 24, 39, 1), rgba(17, 24, 39, 0));
        }
        
        .ticker-content {
          display: inline-flex;
          gap: 1.5rem;
          animation: scroll-ltr 40s linear infinite;
          will-change: transform;
        }
        
        @keyframes scroll-ltr {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .ticker-wrapper:hover .ticker-content {
          animation-play-state: paused;
        }
        
        .ticker-item {
          flex-shrink: 0;
          white-space: nowrap;
        }
        
        .plus {
          border-left-color: rgba(34, 197, 94, 0.3);
        }
        
        .minus {
          border-left-color: rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
};

export default PriceTicker;
