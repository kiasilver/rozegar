import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'تبلیغات بنری و گزارش آگهی | روزمرگی',
  description: 'برای تبلیغات بنری و گزارش آگهی در سایت روزمرگی با ما تماس بگیرید',
  alternates: {
    canonical: '/ads',
  },
};

export default async function AdsPage() {
  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 md:py-10 lg:py-12">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            تبلیغات بنری و گزارش آگهی
          </h1>
          
          <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none mb-6 sm:mb-8">
            <p className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-5 md:mb-6">
              پایگاه اطلاع‌رسانی روزمرگی طیف گسترده‌ای از مخاطبان از فعالان اقتصادی، مسئولان و سیاست‌گذاران دولتی و حاکمیتی، مدیران شرکتی، مسئولان بنگاه‌ها و اشخاص حقیقی و همچنین خانوارها و آحاد جامعه دارد. همین موضوع سبب شده است اخبار و اطلاعات منتشر شده در روزمرگی و شبکه‌های اجتماعی وابسته به طور مؤثر به دست طیف وسیعی از افراد و اشخاص برسد. چنین شرایطی برای گسترش فعالیت شرکت‌هایی که تعداد قابل توجهی ذینفع دارند (از جمله بانک‌ها، شرکت‌های کارگزاری، صندوق‌های سرمایه‌گذاری و شرکت‌های بورسی و فرابورسی، تولیدکنندگان صنعتی و ...) ایده‌آل به نظر می‌رسد.
            </p>
            
            <p className="text-gray-600 text-sm sm:text-base md:text-lg leading-relaxed mb-4 sm:mb-5 md:mb-6">
              علاوه بر محبوبیت روزمرگی در میان مخاطبان و سیاست‌گذاران، این رسانه ارتباط و نفوذ قابل توجهی در فضای رسانه‌ای دارد و ضریب بالای بازنشر اخبار روزمرگی در سایر رسانه‌های عمومی و تخصصی باعث می‌شود دیده شدن مطالب شتاب بیشتری به خود بگیرد.
            </p>
            
            <div className="bg-blue-50 border-r-4 border-blue-500 p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
              <p className="text-gray-800 font-semibold mb-2 text-sm sm:text-base">
                برای درج آگهی در پایگاه خبری روزمرگی با شماره ۸۶۰۹۳۷۸۶ تماس بگیرید
              </p>
              <p className="text-gray-800 font-semibold text-sm sm:text-base">
                برای درج آگهی ارز دیجیتال در پایگاه خبری روزمرگی با شماره ۸۶۰۹۳۶۲۸ تماس بگیرید
              </p>
            </div>
          </div>

          {/* Ad Positions Info */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">
              موقعیت‌های تبلیغاتی موجود
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">بالای هدر</h3>
                <p className="text-xs sm:text-sm text-gray-600">تبلیغ در بالای صفحه اصلی</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">وسط هدر</h3>
                <p className="text-xs sm:text-sm text-gray-600">تبلیغ در وسط منوی اصلی</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">Sidebar</h3>
                <p className="text-xs sm:text-sm text-gray-600">تبلیغات در نوار کناری صفحات</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">داخل محتوا</h3>
                <p className="text-xs sm:text-sm text-gray-600">تبلیغات در بین محتوای مقالات</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">بنر پایین صفحه</h3>
                <p className="text-xs sm:text-sm text-gray-600">بنر تمام عرض در پایین صفحات</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-sm sm:text-base">چسبنده پایین راست</h3>
                <p className="text-xs sm:text-sm text-gray-600">تبلیغ ثابت در گوشه پایین راست</p>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="border-t border-gray-200 pt-6 sm:pt-8 mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
              حقوق تبلیغات در روزمرگی
            </h2>
            <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-gray-700 space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base">
                هر گونه استفاده از مطالب روزمرگی (به عنوان تبلیغ دهنده یا تبلیغ گیرنده) مستلزم مطلع بودن، پذیرفتن و پیروی از شرایط و مقررات سایت است که در ادامه خواهد آمد:
              </p>
              
              <ul className="list-disc list-inside space-y-2 pr-3 sm:pr-4 text-sm sm:text-base">
                <li>
                  تمامی فعالیت‌های پایگاه خبری روزمرگی بر پایه قوانین جمهوری اسلامی ایران و با رعایت موازین اعلام شده توسط وزارت فرهنگ و ارشاد اسلامی و با رعایت حقوق مخاطبان انجام می‌شود.
                </li>
                <li>
                  پایگاه خبری روزمرگی مسئولیتی در قبال محتوای تبلیغاتی منتشر شده در سایت و شبکه‌های اجتماعی خود ندارد.
                </li>
                <li>
                  در محتوای تبلیغاتی منتشر شده در حوزه بورس و ارز دیجیتال، روزمرگی هیچگونه مسئولیتی درباره صحت اطلاعات موجود در گزارش‌ها و مطالب تهیه شده توسط شرکت‌های فعال در بازار سرمایه و صرافی‌های ارز دیجیتال بر عهده نمی‌گیرد.
                </li>
                <li>
                  نظرات ارائه شده در گزارش‌ها به هیچ وجه به عنوان توصیه‌ای جهت خرید، فروش یا نگهداری سهام شرکت‌ها و سایر ابزارهای معاملاتی نمی‌باشد و مسئولیت استفاده از این اطلاعات با مراجعه کنندگان به سایت است.
                </li>
                <li>
                  لازم است مخاطبان قبل از هر معامله، بررسی‌های لازم برای احراز صحت مطالب عنوان شده را شخصاً انجام دهند.
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6 sm:pt-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
              تماس با ما
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">تماس برای درج آگهی</h3>
                  <a
                    href="tel:86093786"
                    className="text-blue-600 hover:text-blue-700 text-base sm:text-lg"
                  >
                    ۸۶۰۹۳۷۸۶
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">تماس برای درج آگهی ارز دیجیتال</h3>
                  <a
                    href="tel:86093628"
                    className="text-blue-600 hover:text-blue-700 text-base sm:text-lg"
                  >
                    ۸۶۰۹۳۶۲۸
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 sm:mt-8 bg-blue-50 rounded-lg p-4 sm:p-5 md:p-6 text-center">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              آماده شروع هستید؟
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              برای دریافت اطلاعات بیشتر و قیمت‌گذاری، با ما تماس بگیرید
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <a
                href="tel:86093786"
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                تماس: ۸۶۰۹۳۷۸۶
              </a>
              <a
                href="tel:86093628"
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                تماس ارز دیجیتال: ۸۶۰۹۳۶۲۸
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

