"use client"
import React, { useState } from 'react';
import Lastnews from '@/components/site/widget/lastnews';


const Article2: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'latest' | 'selected'>('latest');

  return (
    <div className='rounded-t-2xl border'>
      <div>
        <span className="rounded-t-2xl flex w-full divide-x divide-gray-300 overflow-hidden border-b-1 bg-white dark:divide-gray-600 dark:border-gray-600 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('latest')}
            className={`w-full px-3 py-3 text-sm font-medium transition-colors focus:relative ${
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
            className={`w-full px-3 py-3 text-sm font-medium transition-colors focus:relative ${
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
          <div className='p-4 text-gray-600 dark:text-gray-300'>
            {/* Replace this with your real component for selected news */}
            Selected news content goes here.
          </div>
        )}
      </div>
    </div>
  );
};

export default Article2;
