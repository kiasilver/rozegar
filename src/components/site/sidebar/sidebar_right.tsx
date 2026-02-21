"use client"
import React, { useState } from 'react';
import Lastnews from '@/components/site/widget/lastnews';
import FeaturedNews from '@/components/site/widget/featurednews';
import AdBanner from '@/components/site/ads/adbanner';
import AdSidebarList from '@/components/site/ads/adsidebarlist';


const Article2: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'latest' | 'selected'>('latest');

  return (
    <div className="space-y-3 sm:space-y-4 sticky top-2 sm:top-4">
      {/* تبلیغ بالای sidebar */}
      <AdBanner position="SIDEBAR_TOP" className="mb-3 sm:mb-4" />
      
      <div className='rounded-t-xl sm:rounded-t-2xl border'>
        <div>
          <span className="rounded-t-xl sm:rounded-t-2xl flex w-full divide-x divide-gray-300 overflow-hidden border-b-1 bg-white dark:divide-gray-600 dark:border-gray-600 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('latest')}
            className={`w-full px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors focus:relative ${
              activeTab === 'latest'
                ? 'bg-gray-100 text-black dark:bg-gray-700 dark:text-white'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-500 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white'
            }`}
          >
            آخرین اخبار
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('selected')}
            className={`w-full px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors focus:relative ${
              activeTab === 'selected'
                ? 'bg-gray-100 text-black dark:bg-gray-700 dark:text-white'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-500 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white'
            }`}
          >
            اخبار برگزیده
          </button>
        </span>
      </div>

      <div>
        {activeTab === 'latest' ? (
          <Lastnews />
        ) : (
          <FeaturedNews />
        )}
      </div>
      </div>
      
      {/* لیست تبلیغات sidebar - تا 15 تبلیغ */}
      <AdSidebarList position="SIDEBAR_MIDDLE" limit={15} className="my-3 sm:my-4" />
      
      {/* تبلیغ پایین sidebar */}
      <AdBanner position="SIDEBAR_BOTTOM" className="mt-3 sm:mt-4" />
    </div>
  );
};

export default Article2;
