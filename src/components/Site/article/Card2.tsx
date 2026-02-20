import React from 'react';
import AuthorN from '@/components/Site/author/author1';

import Date1 from '@/components/Site/date/date2';

const Card2: React.FC = () => {
    return (
        <article
  className="rounded-[10px] border border-gray-200 bg-white px-4 pt-6 pb-4 dark:border-gray-700 dark:bg-gray-900"
>
    <div className='flex flex-row-reverse mb-4'>
    <AuthorN/>
    </div>
    <div className='flex flex-row'>
   
  <div className=" sm:block sm:basis-56 flex flex-row">
    <span className='w-full px-2 flex '>
    <img
      alt=""
      src="https://images.unsplash.com/photo-1609557927087-f9cf8e88de18?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80"
      className="rounded-xl aspect-square h-full w-full object-cover"
      
      
    />
    </span>
  </div>
  <div className='flex flex-col justify-between'>
  <a href="#" className='flex flex-row'>
    <h3 className="mt-[-5px] text-lg font-medium text-gray-900 dark:text-white">
      How to center an element using JavaScript and jQuery
    </h3>
  </a>

        <Date1/>
  </div>


  </div>


 






  </article>





    );
};

export default Card2;