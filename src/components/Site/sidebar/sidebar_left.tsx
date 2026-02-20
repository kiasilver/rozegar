import React from 'react';
import Lastnews from '@/components/Site/widget/Lastnews';
import Title from '@/components/Site/titleshow/Title1';
const Article2: React.FC = () => {
    return (
        <div className='border rounded-t-xl sm:rounded-t-2xl'>
            <Title/>
            <Lastnews/>
        </div>
    );
};

export default Article2;