# راهنمای افزایش Quota برای Google Gemini API

## مشکل: خطای 429 (Quota Exceeded)

اگر پیام خطای زیر را می‌بینید:
```
Gemini API error (429): You exceeded your current quota
```

این یعنی quota رایگان شما تمام شده است.

## راه‌حل‌ها

### 1. افزایش Quota در Google AI Studio

1. به [Google AI Studio](https://aistudio.google.com/) بروید
2. وارد حساب Google خود شوید
3. به بخش **Settings** یا **API Keys** بروید
4. روی **Quota** یا **Usage** کلیک کنید
5. اگر امکان افزایش quota وجود دارد، آن را فعال کنید

### 2. استفاده از Google Cloud Console

1. به [Google Cloud Console](https://console.cloud.google.com/) بروید
2. پروژه خود را انتخاب کنید
3. به **APIs & Services** > **Credentials** بروید
4. API Key خود را پیدا کنید
5. به **APIs & Services** > **Quotas** بروید
6. برای **Generative Language API** quota را بررسی و افزایش دهید

### 3. ایجاد API Key جدید

اگر quota رایگان تمام شده، می‌توانید:

1. به [Google AI Studio](https://aistudio.google.com/) بروید
2. یک API Key جدید ایجاد کنید
3. API Key جدید را در تنظیمات سیستم جایگزین کنید

### 4. استفاده از Google Cloud Billing

برای افزایش quota به صورت نامحدود:

1. به [Google Cloud Console](https://console.cloud.google.com/) بروید
2. **Billing** را فعال کنید
3. یک حساب پرداخت اضافه کنید
4. Quota به صورت خودکار افزایش می‌یابد

## محدودیت‌های Quota رایگان

- **Rate Limit**: 15 requests per minute (RPM)
- **Daily Limit**: بسته به نوع API key متفاوت است
- **Monthly Limit**: معمولاً 1500 requests در ماه

## نکات مهم

1. **Quota Reset**: Quota روزانه معمولاً هر 24 ساعت reset می‌شود
2. **Monitoring**: استفاده خود را در Google Cloud Console بررسی کنید
3. **Fallback**: می‌توانید fallback mechanism را فعال کنید تا در صورت تمام شدن quota، از provider دیگری استفاده شود

## لینک‌های مفید

- [Google AI Studio](https://aistudio.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Pricing Information](https://ai.google.dev/pricing)

## راهنمای فارسی

برای راهنمای کامل فارسی، به [مستندات Google Gemini](https://ai.google.dev/gemini-api/docs) مراجعه کنید.

