# Unified RSS Processing System — Documentation

> **مهم:** این فایل مستندات کامل سیستم پردازش خبر است. قبل از هر تغییری، این فایل را بخوانید.
> 
> **IMPORTANT:** This is the complete documentation for the news processing system. Read this file before making any changes.

---

## Processing Flow (ترتیب پردازش)

The unified processor (`unified-rss-processor.ts`) follows this exact order:

```
1. Manual Send?  → Skip Duplicate Check
2. Check Title   → Validate in RSS feed
3. Check Target  → Telegram / Website / Both
4. Extract Image/Video → STOP if no image found
5. Extract Text  → Scrape the news page content only
6. AI Agent      → Summarize according to prompt
7. News Link     → Create "مشروح خبر" link (WITHOUT agent)
8. Hashtags      → Generate from DB categories (WITHOUT agent)
```

### Critical Rules

| Rule | Description |
|------|-------------|
| **No image = STOP** | If the news image cannot be extracted, the processor must stop and not continue |
| **Video download** | If the news has a video, download it |
| **Hashtags from DB** | Read `BlogCategory` from database, generate 3-4 hashtags per category |
| **Link + Hashtags** | "مشروح خبر" link and hashtags are added WITHOUT the AI agent |
| **Manual Send** | Always skip duplicate check (`skipDuplicateCheck: true`) |
| **Auto-swap** | If URL and title are swapped in manual send, auto-correct them |

---

## Prompts (پرامپت‌ها)

Default prompts are in `improved-prompts.ts`. Users can also customize per-target via the PromptsEditor UI (stored in `AIPrompt` table).

### Telegram Prompt Rules
1. **عنوان:** بازنویسی شده — کپی نباشد ولی از خبر دور نباشد
2. **طول:** خبر باید دقیقاً در `max_length` (از تنظیمات) تمام شود
3. **محتوا:** اصل خبر + اشخاص مهم ذکر شود
4. **فرمت:** کلمات کلیدی + عنوان **bold** شود (تگ `<b>`)
5. **اعداد:** آمار مهم (طلا ۴٪، دلار ۰.۳٪) حتماً ذکر شود

### Website Prompt Rules
1. **عنوان:** SEO شده — از خبر دور نباشد
2. **طول:** در `max_length` تمام شود
3. **محتوا:** اصل خبر + اشخاص مهم
4. **فرمت:** کلمات کلیدی + عنوان **bold**
5. **اعداد:** آمار مهم ذکر شود
6. **SEO تکمیلی:** اگر متن کافی نیست، AI به عنوان تحلیلگر اقتصادی خودش تحلیل بنویسد (اولویت: متن extract شده)

### Manual Prompt
Same as Telegram prompt rules.

### Combined Prompt
Merges Telegram + Website rules into single JSON output:
```json
{
  "telegram_summary": "...",
  "website_content": "...",
  "seo_keywords": [...]
}
```

---

## Hashtags (هشتگ‌ها)

Source: `category-hashtags.ts`

- **Primary:** Read `BlogCategory` from Prisma DB (with FA translations)
- **Fallback:** Static map for common categories (اقتصادی, سیاسی, ...)
- **Count:** 3-4 hashtags per category
- **Cache:** 10-minute TTL to avoid excessive DB queries
- **No agent:** Hashtags are generated WITHOUT the AI agent

---

## Future Considerations (نکات آینده)

> [!NOTE]
> These are documented for future implementation:

1. **Per-RSS-Source Custom Extraction:**
   Some RSS sources may need custom image/video extraction rules. Consider adding a `custom_extractor` field to the `RSSSource` model.

2. **Per-Category Custom Formatting:**
   Some categories may need specialized news formatting. Consider adding category-specific prompt overrides.

3. **Video Handling:**
   When a news item has a video, it should be downloaded and served from our host.

---

## File Map (نقشه فایل‌ها)

| File | Purpose |
|------|---------|
| `unified-rss-processor.ts` | Main orchestrator — runs the processing flow |
| `improved-prompts.ts` | Default prompt templates (Telegram, Website, Manual, Combined) |
| `category-hashtags.ts` | Dynamic hashtag generation from DB categories |
| `unified-content-extractor.ts` | Content extraction (text, image, video from URLs) |
| `telegram-bot.ts` | Telegram message formatting, link creation, hashtag appending |
| `telegram-agent.ts` | AI agent integration for summarization |
| `backboard-helper.ts` | Backboard API helper for AI calls |
| `manual-send/route.ts` | Manual Send API endpoint |
| `PromptsEditor.tsx` | Admin UI for editing prompts per target |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-16 | Initial documentation created |
| 2026-02-16 | All 4 prompts rewritten with user's summarization rules |
| 2026-02-16 | Hashtags switched from static map to dynamic DB-based |
| 2026-02-16 | Manual Send: skip duplicate check + auto-swap URL/title |
| 2026-02-16 | Added "stop if no image" rule |
