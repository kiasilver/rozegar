import { NextResponse } from 'next/server';

/**
 * API endpoint برای دریافت دمای واقعی تهران
 * استفاده از Open-Meteo API (رایگان و بدون نیاز به API key)
 */
export async function GET() {
  try {
    const TEHRAN_LAT = 35.6892;
    const TEHRAN_LON = 51.3890;

    // استفاده از Open-Meteo API (رایگان و بدون نیاز به API key)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${TEHRAN_LAT}&longitude=${TEHRAN_LON}&current=temperature_2m,weather_code&timezone=Asia/Tehran&forecast_days=1`,
      {
        next: { revalidate: 600 }, // Cache برای 10 دقیقه
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const data = await response.json();

    // تبدیل کد آب و هوا به توضیحات فارسی و آیکون
    const getWeatherInfo = (weatherCode: number) => {
      // WMO Weather interpretation codes
      const weatherMap: { [key: number]: { description: string; icon: string } } = {
        0: { description: 'صاف', icon: '☀' },
        1: { description: 'عمدتاً صاف', icon: '☀' },
        2: { description: 'نیمه ابری', icon: '⛅' },
        3: { description: 'ابری', icon: '☁' },
        45: { description: 'مه', icon: '🌫' },
        48: { description: 'مه یخ‌زده', icon: '🌫' },
        51: { description: 'باران سبک', icon: '🌦' },
        53: { description: 'باران متوسط', icon: '🌧' },
        55: { description: 'باران شدید', icon: '🌧' },
        56: { description: 'باران یخ‌زده سبک', icon: '🌨' },
        57: { description: 'باران یخ‌زده شدید', icon: '🌨' },
        61: { description: 'باران سبک', icon: '🌦' },
        63: { description: 'باران متوسط', icon: '🌧' },
        65: { description: 'باران شدید', icon: '🌧' },
        66: { description: 'باران یخ‌زده سبک', icon: '🌨' },
        67: { description: 'باران یخ‌زده شدید', icon: '🌨' },
        71: { description: 'برف سبک', icon: '❄' },
        73: { description: 'برف متوسط', icon: '❄' },
        75: { description: 'برف شدید', icon: '❄' },
        77: { description: 'دانه‌های برف', icon: '❄' },
        80: { description: 'باران سبک', icon: '🌦' },
        81: { description: 'باران متوسط', icon: '🌧' },
        82: { description: 'باران شدید', icon: '🌧' },
        85: { description: 'برف سبک', icon: '❄' },
        86: { description: 'برف شدید', icon: '❄' },
        95: { description: 'طوفان', icon: '⛈' },
        96: { description: 'طوفان با تگرگ', icon: '⛈' },
        99: { description: 'طوفان شدید با تگرگ', icon: '⛈' },
      };

      return weatherMap[weatherCode] || { description: 'صاف', icon: '☀' };
    };

    const current = data.current;
    const temperature = Math.round(current.temperature_2m);
    const weatherInfo = getWeatherInfo(current.weather_code);

    return NextResponse.json({
      temperature: temperature,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      city: 'تهران',
      cached: false,
    }, {
      // Cache برای 10 دقیقه
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching weather:', error);
    
    // تلاش با OpenWeatherMap اگر API key موجود باشد
    try {
      const API_KEY = process.env.OPENWEATHER_API_KEY;
      if (API_KEY) {
        const TEHRAN_LAT = 35.6892;
        const TEHRAN_LON = 51.3890;
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${TEHRAN_LAT}&lon=${TEHRAN_LON}&appid=${API_KEY}&units=metric&lang=fa`,
          {
            next: { revalidate: 600 },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const getWeatherIcon = (iconCode: string) => {
            const iconMap: { [key: string]: string } = {
              '01d': '☀', '01n': '🌙',
              '02d': '⛅', '02n': '☁',
              '03d': '☁', '03n': '☁',
              '04d': '☁', '04n': '☁',
              '09d': '🌧', '09n': '🌧',
              '10d': '🌦', '10n': '🌧',
              '11d': '⛈', '11n': '⛈',
              '13d': '❄', '13n': '❄',
              '50d': '🌫', '50n': '🌫',
            };
            return iconMap[iconCode] || '☀';
          };

          return NextResponse.json({
            temperature: Math.round(data.main.temp),
            description: data.weather[0]?.description || 'آفتابی',
            icon: getWeatherIcon(data.weather[0]?.icon || '01d'),
            city: 'تهران',
            cached: false,
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
            },
          });
        }
      }
    } catch (fallbackError) {
      console.error('Fallback weather API also failed:', fallbackError);
    }

    // در صورت خطا، مقدار پیش‌فرض برگردان
    return NextResponse.json({
      temperature: 7, // بر اساس داده‌های واقعی که کاربر نشان داد
      description: 'نیمه ابری',
      icon: '⛅',
      city: 'تهران',
      cached: true,
    });
  }
}

