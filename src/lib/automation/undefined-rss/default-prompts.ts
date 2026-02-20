export const DEFAULT_TELEGRAM_PROMPT = `این خبر را برای انتشار در کانال تلگرام خلاصه و بازنویسی کن.

عنوان: {title}
دسته: {category}

محتوا:
{content}

الزامات:
- طول: {length}
- لحن: {tone}
- زبان: {language}
- فقط متن خلاصه را برگردان (بدون عنوان)`;

export const DEFAULT_WEBSITE_PROMPT = `یک پست وبلاگ جذاب و سئو شده درباره این موضوع بنویس.

عنوان: {title}
دسته: {category}

محتوا:
{content}

الزامات:
- ساختار مقاله: مقدمه، بدنه اصلی (با تیترهای جذاب)، نتیجه‌گیری
- کلمات کلیدی: {keywords}
- لحن: {tone}
- زبان: {language}
- طول: {length}
- متا دیسکریپشن جذاب هم تولید کن`;
