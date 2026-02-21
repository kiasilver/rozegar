import React from 'react';
import Lastnews from '@/components/site/widget/lastnews';
import Title from '@/components/site/titleshow/title1';
const Article2: React.FC = () => {
    return (
        <div className='border rounded-t-xl sm:rounded-t-2xl'>
            <Title/>
            <Lastnews/>
        </div>
    );
};

export default Article2;