import React from 'react';

const Buttongroup = () => {
    return (
        <div className=''>
            <span className="rounded-t-2xl flex w-full divide-x divide-gray-300 overflow-hidden  border-b-1 bg-white dark:divide-gray-600 dark:border-gray-600 dark:bg-gray-800">
  <button
    type="button"
    className="w-full px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-500 focus:relative dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
  >
    Latest
  </button>

  <button
    type="button"
    className="w-full px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-500 focus:relative dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
  >
    Selected News
  </button>

 
</span>
        </div>
    );
};

export default Buttongroup;