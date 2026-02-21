# راهنمای رفع مشکل Cloudflare Anti-Abuse

## مشکل
صفحه "anti abuse" یا "suspended page" از Cloudflare نمایش داده می‌شود.

## راه‌حل‌ها

### 1. بررسی Cloudflare Dashboard

#### Security > WAF
- به Cloudflare Dashboard بروید
- Security > WAF را باز کنید
- Custom Rules را بررسی کنید
- اگر rule مشکوکی وجود دارد، آن را disable کنید

#### Security > Settings
- Security > Settings را باز کنید
- Challenge Passage را بررسی کنید
- اگر خیلی سخت است، آن را نرم‌تر کنید

#### Firewall Rules
- Security > Firewall Rules را باز کنید
- Rules را بررسی کنید
- اگر rule مشکوکی وجود دارد، آن را disable کنید

### 2. تنظیمات Rate Limiting
- Security > Rate Limiting را باز کنید
- Rules را بررسی کنید
- اگر خیلی سخت است، آن را نرم‌تر کنید

### 3. Bypass برای IP شما
- Security > WAF > Tools
- IP Access Rules را باز کنید
- IP خود را به Allowlist اضافه کنید

### 4. غیرفعال کردن موقت
- Security > Settings
- Security Level را روی "Medium" یا "Low" قرار دهید
- Bot Fight Mode را غیرفعال کنید (اگر مشکل ایجاد می‌کند)

## تست
بعد از تغییرات، سایت را refresh کنید و بررسی کنید که مشکل حل شده است.

