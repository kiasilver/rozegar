"use client"
import React from 'react';
import { useState } from 'react';

import RssFeedOutlinedIcon from '@mui/icons-material/RssFeedOutlined';
const newsData = [
  {
    id: 1,
    title: 'افزایش کیفیت بنزین در پالایشگاه تهران به استاندارد یورو ۵',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'مدیرعامل پالایشگاه تهران از اقدامات صورت‌گرفته برای ارتقای کیفیت بنزین خبر داد.',
  },
  {
    id: 2,
    title: 'قیمت گندم تا فصل بعدی بدون تغییر باقی می‌ماند',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'وزارت جهاد کشاورزی اعلام کرد قیمت خرید تضمینی گندم تغییر نخواهد کرد.',
  },
  {
    id: 3,
    title: 'نصب دوربین مداربسته در ساختمان‌ها الزامی شد',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'طبق قانون جدید، نصب دوربین امنیتی در مجتمع‌های مسکونی و تجاری اجباری است.',
  },
  {
    id: 4,
    title: 'کم‌آبی و تهدید برای تانکرهای سوخت جدی است',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'کارشناسان نسبت به کمبود منابع آبی و خطرات برای حمل سوخت هشدار دادند.',
  },
  {
    id: 5,
    title: 'تورم در بازار مسکن به بالاترین حد خود رسید',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'گزارش‌ها نشان می‌دهد قیمت مسکن در تهران به طرز بی‌سابقه‌ای افزایش یافته است.',
  },
  {
    id: 6,
    title: 'واردات خودروهای برقی از ماه آینده آغاز می‌شود',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'وزارت صنعت اعلام کرد واردات خودروهای الکتریکی برای کاهش آلودگی هوا آغاز خواهد شد.',
  },
  {
    id: 7,
    title: 'برنامه دولت برای کاهش وابستگی به نفت خام',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'دولت در حال تدوین برنامه‌ای برای تمرکز بر صادرات غیرنفتی است.',
  },
  {
    id: 8,
    title: 'کاهش ذخایر آب سدهای کشور نگران‌کننده است',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'بررسی‌ها نشان می‌دهد سطح آب سدها نسبت به سال گذشته کاهش چشمگیری داشته است.',
  },
  {
    id: 9,
    title: 'ممنوعیت استفاده از کیسه‌های پلاستیکی در فروشگاه‌ها',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'شهرداری‌ها موظف به اجرای طرح حذف کیسه‌های پلاستیکی تا پایان سال شده‌اند.',
  },
  {
    id: 10,
    title: 'اجرای طرح مالیات بر خانه‌های خالی آغاز شد',
    img: 'https://jnews.io/investnews/wp-content/uploads/sites/81/2021/08/leader-speaking-9QEEMM9-750x375.jpg',
    description: 'بر اساس قانون جدید، خانه‌های خالی مشمول پرداخت مالیات خواهند شد.',
  },
];

export default function SliderClick() {
    const [selected, setSelected] = useState(newsData[0]);
  
    return (
      <div>
      <div className="flex flex-col md:flex-row gap-4 relative p-4 bg-white rounded  mt-20s">
          <span className='absolute top-[-50px] right-0 bg-white px-3 py-3  text-primary rounded font-semibold'> گفتگو و تحلیل <RssFeedOutlinedIcon/></span>
        {/* Titles List */}
        <div className="w-full md:w-1/2 space-y-2">
          {newsData.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelected(item)}
              className={`cursor-pointer border-r-4 pr-2 hover:text-primary ${selected.id === item.id ? 'border-primary font-bold text-primary' : 'border-transparent'}`}
            >
              {item.title}
            </div>
          ))}
        </div>
        <div className="w-full md:w-1/2 bg-primary rounded p-4 flex flex-col items-center text-center">
        <img src={selected.img} alt={selected.title} className="w-full max-h-60 object-cover rounded mb-4" />
        <h2 className="font-bold text-white">{selected.title}</h2>
        <p className="text-gray-300 mt-2">{selected.description}</p>
      </div>
        </div>
        
    </div>
    )
}
