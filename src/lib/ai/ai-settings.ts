import { prisma } from "@/lib/core/prisma";
import type {
  AIModelSuggestion,
  AIProvider,
  AIProviderSettings,
  AISettings,
} from "@/types/ai";

const AI_SETTINGS_KEY = "ai_settings";

const defaultProviderSettings: Record<AIProvider, AIProviderSettings> = {
  huggingface: {
    apiKey: "", // اختیاری - بسیاری از مدل‌ها بدون API key کار می‌کنند
    model: "ysn-rfd/YASIN-Persian-Base", // مدل تخصصی فارسی برای تولید محتوا
    enabled: false,
    label: "Hugging Face (رایگان)",
    isLimitedFree: true,
    notes: "API key اختیاری است - بسیاری از مدل‌ها کاملاً رایگان هستند. مدل YASIN-Persian-Base یک مدل تخصصی فارسی است. توجه: مدل‌های custom architecture (مثل YASIN که نیاز به trust_remote_code دارد) ممکن است در Inference API در دسترس نباشند. در این صورت از مدل دیگری استفاده کنید یا مدل را به صورت محلی نصب کنید.",
  },
  cursor: {
    apiKey: "",
    model: "auto",
    enabled: false,
    label: "Cursor Agent (Auto Model)",
    notes: "همیشه از مدل auto استفاده می‌شود - Cursor بهترین مدل را انتخاب می‌کند. نیاز به Usage-based pricing دارد.",
    repository: "", // اختیاری - اگر خالی باشد، از conversation استفاده می‌شود
  },
  custom: {
    apiKey: "",
    model: "gpt-4o-mini",
    enabled: false,
    label: "Custom AI (سفارشی)",
    notes: "استفاده از API سفارشی سازگار با OpenAI. نیاز به endpoint و API key دارد.",
    endpoint: "", // endpoint URL برای Custom AI
  },
  openai: {
    apiKey: "",
    model: "gpt-3.5-turbo",
    enabled: false,
    label: "OpenAI (GPT-3.5-turbo / GPT-4o)",
    notes: "استفاده مستقیم از OpenAI API. پشتیبانی از GPT-3.5-turbo (ارزان‌تر) و GPT-4o. نیاز به API key و billing فعال دارد.",
  },
  backboard: {
    apiKey: "espr_S75Dkze4cib_IYIZVovmpdLfwO8FQs6l7nYorufY7p0",
    model: "gpt-3.5-turbo",
    enabled: true,
    label: "Backboard.io (2200+ LLMs)",
    notes: "استفاده از Backboard.io API که به 2200+ مدل LLM دسترسی دارد. نیاز به API key دارد. مستندات: https://app.backboard.io/docs. توجه: Backboard از API مبتنی بر Assistant استفاده می‌کند (نیاز به Assistant و Thread).",
    endpoint: "https://app.backboard.io/api", // endpoint صحیح Backboard (Assistant-based API)
    assistantId: "", // ID Assistant (اختیاری - اگر خالی باشد، خودکار ایجاد می‌شود)
  },
  gemini: {
    apiKey: "AIzaSyClvqpLxm2P6Ut9w1-cJYxs0nGiAHeDpYw",
    model: "gemini-2.5-flash",
    enabled: true,
    label: "Google Gemini (Flash Lite / Flash 2.5)",
    notes: "استفاده از Google Gemini API. پشتیبانی از مدل‌های Gemini 2.5 Flash Lite (سریع‌ترین) و Gemini 2.5 Flash (بهترین تعادل). نیاز به API key دارد. مستندات: https://ai.google.dev/gemini-api/docs",
  },
};

const defaultSettings: AISettings = {
  defaultProvider: "gemini", // پیش‌فرض: Gemini (فعال شده با API key)
  fallbackProvider: "backboard", // پیش‌فرض fallback: Backboard
  enableFallback: true, // پیش‌فرض: fallback فعال است
  providers: defaultProviderSettings,
  imageApis: {
    unsplash: "",
    pexels: "",
  },
};

export const AI_MODEL_SUGGESTIONS: AIModelSuggestion[] = [
  {
    provider: "huggingface",
    value: "ysn-rfd/YASIN-Persian-Base",
    label: "YASIN-Persian-Base (تولید محتوای فارسی)",
    tier: "free",
    description: "مدل تخصصی فارسی برای تولید محتوا - طراحی شده برای زبان فارسی. توجه: ممکن است در Inference API در دسترس نباشد و نیاز به نصب محلی داشته باشد.",
  },
  {
    provider: "huggingface",
    value: "facebook/bart-large-cnn",
    label: "BART Large CNN (خلاصه‌سازی - انگلیسی/فارسی)",
    tier: "free",
    description: "مدل رایگان برای خلاصه‌سازی متن - در Inference API پشتیبانی می‌شود",
  },
  {
    provider: "huggingface",
    value: "google/pegasus-xsum",
    label: "Pegasus XSum (خلاصه‌سازی خبری)",
    tier: "free",
    description: "مدل رایگان برای خلاصه‌سازی اخبار - در Inference API پشتیبانی می‌شود",
  },
  {
    provider: "huggingface",
    value: "t5-base",
    label: "T5 Base (تولید متن)",
    tier: "free",
    description: "مدل رایگان برای تولید و پردازش متن",
  },
  {
    provider: "huggingface",
    value: "gpt2",
    label: "GPT-2 (تولید متن)",
    tier: "free",
    description: "مدل رایگان برای تولید متن - نیازی به API key ندارد",
  },
  {
    provider: "cursor",
    value: "auto",
    label: "Cursor Agent (Auto)",
    tier: "paid",
    description: "استفاده از Cursor Cloud Agents با مدل auto - بهترین مدل به صورت خودکار انتخاب می‌شود. نیاز به Usage-based pricing دارد.",
  },
  {
    provider: "openai",
    value: "gpt-3.5-turbo",
    label: "GPT-3.5-turbo (ارزان‌تر - پیشنهادی)",
    tier: "paid",
    description: "مدل ارزان OpenAI برای خلاصه‌سازی و هشتگ‌گذاری. هزینه 84.7% کمتر از GPT-4o. مناسب برای خبر.",
  },
  {
    provider: "openai",
    value: "gpt-4o",
    label: "GPT-4o (بهترین کیفیت)",
    tier: "paid",
    description: "مدل پیشرفته OpenAI با بهترین کیفیت. مناسب برای کارهای پیچیده‌تر.",
  },
  {
    provider: "openai",
    value: "gpt-4o-mini",
    label: "GPT-4o-mini (تعادل قیمت/کیفیت)",
    tier: "paid",
    description: "نسخه کوچک‌تر GPT-4o با کیفیت خوب و هزینه کمتر.",
  },
  {
    provider: "backboard",
    value: "gpt-3.5-turbo",
    label: "GPT-3.5-turbo (از طریق Backboard)",
    tier: "paid",
    description: "استفاده از GPT-3.5-turbo از طریق Backboard.io API.",
  },
  {
    provider: "backboard",
    value: "gpt-4o",
    label: "GPT-4o (از طریق Backboard)",
    tier: "paid",
    description: "استفاده از GPT-4o از طریق Backboard.io API.",
  },
  {
    provider: "backboard",
    value: "claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet (از طریق Backboard)",
    tier: "paid",
    description: "استفاده از Claude 3.5 Sonnet از طریق Backboard.io API.",
  },
  {
    provider: "backboard",
    value: "gpt-4o-mini",
    label: "GPT-4o-mini (از طریق Backboard)",
    tier: "paid",
    description: "استفاده از GPT-4o-mini از طریق Backboard.io API. مدل ارزان با کیفیت خوب.",
  },
  {
    provider: "backboard",
    value: "gpt-4.1-mini",
    label: "GPT-4.1-mini (از طریق Backboard - پیشرفته)",
    tier: "paid",
    description: "استفاده از GPT-4.1-mini از طریق Backboard.io API. نسخه پیشرفته با context window 1M token.",
  },
  {
    provider: "gemini",
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash (بهترین تعادل - پیشنهادی)",
    tier: "paid",
    description: "مدل جدید Gemini 2.5 Flash با تعادل عالی بین سرعت و کیفیت. مناسب برای تولید محتوا.",
  },
  {
    provider: "gemini",
    value: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite (سریع‌ترین)",
    tier: "paid",
    description: "سریع‌ترین مدل Google Gemini (Flash Lite) - مناسب برای کارهای ساده و سریع.",
  },
  {
    provider: "gemini",
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash (سریع و ارزان)",
    tier: "paid",
    description: "مدل سریع و ارزان Google Gemini با عملکرد عالی. مناسب برای کارهای روزمره.",
  },
  {
    provider: "gemini",
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro (بهترین کیفیت)",
    tier: "paid",
    description: "مدل پیشرفته Google Gemini با بهترین کیفیت. مناسب برای کارهای پیچیده.",
  },
  {
    provider: "gemini",
    value: "gemini-3-flash-preview",
    label: "Gemini 3 Flash Preview (جدیدترین)",
    tier: "paid",
    description: "نسخه پیش‌نمایش مدل Gemini 3 Flash - جدیدترین مدل Google.",
  },
  {
    provider: "gemini",
    value: "gemini-3-pro",
    label: "Gemini 3 Pro (بهترین در جهان)",
    tier: "paid",
    description: "قدرتمندترین مدل Google Gemini - بهترین در جهان برای درک چندرسانه‌ای.",
  },
];

function mergeWithDefaults(settings?: AISettings | null): AISettings {
  if (!settings) return structuredClone(defaultSettings);

  // اطمینان از اینکه همه provider ها در mergedProviders وجود دارند
  const mergedProviders = { ...defaultProviderSettings };

  // اضافه کردن provider های جدید از settings (اگر وجود داشته باشند)
  (Object.keys(settings.providers) as AIProvider[]).forEach((provider) => {
    if (defaultProviderSettings[provider]) {
      const dbConfig = settings.providers[provider];
      const defaultConfig = defaultProviderSettings[provider];

      mergedProviders[provider] = {
        ...defaultConfig,
        ...dbConfig,
        // Fallback to default if DB value is empty (crucial for API Key)
        apiKey: dbConfig.apiKey || defaultConfig.apiKey,
        endpoint: dbConfig.endpoint || defaultConfig.endpoint,
        // Force enable Backboard if we have a key (Fix for user issues)
        enabled: (provider === 'backboard' && (!!dbConfig.apiKey || !!defaultConfig.apiKey))
          ? true
          // Force enable Gemini if we have a key (Fix for user issues)
          : (provider === 'gemini' && (!!dbConfig.apiKey || !!defaultConfig.apiKey))
          ? true
          : (dbConfig.enabled ?? defaultConfig.enabled),
      };
    } else {
      // اگر provider جدیدی در settings وجود دارد که در default نیست، اضافه کن
      mergedProviders[provider] = settings.providers[provider];
    }
  });

  // اطمینان از اینکه همه provider های default در mergedProviders وجود دارند
  (Object.keys(defaultProviderSettings) as AIProvider[]).forEach((provider) => {
    if (!mergedProviders[provider]) {
      mergedProviders[provider] = defaultProviderSettings[provider];
    }
  });

  return {
    defaultProvider: settings.defaultProvider ?? defaultSettings.defaultProvider,
    fallbackProvider: settings.fallbackProvider ?? defaultSettings.fallbackProvider,
    enableFallback: settings.enableFallback ?? defaultSettings.enableFallback,
    providers: mergedProviders,
    imageApis: settings.imageApis ?? defaultSettings.imageApis,
  };
}

export async function getAISettings(): Promise<AISettings> {
  try {
    const existing = await prisma.siteSetting.findUnique({
      where: { key: AI_SETTINGS_KEY },
    });

    if (!existing?.value) {
      return structuredClone(defaultSettings);
    }

    try {
      const parsed = JSON.parse(existing.value) as AISettings;
      return mergeWithDefaults(parsed);
    } catch (error) {
      console.error("Failed to parse AI settings, using defaults:", error);
      return structuredClone(defaultSettings);
    }
  } catch (error: any) {
    // اگر دیتابیس در دسترس نباشد (مثلاً در اسکریپت تست)، از تنظیمات پیش‌فرض استفاده کن
    if (error.code === 'ECONNREFUSED' || error.code === 'P1001') {
      console.warn("Database not available, using default AI settings");
      return structuredClone(defaultSettings);
    }
    // برای خطاهای دیگر هم از پیش‌فرض استفاده کن
    console.error("Error getting AI settings, using defaults:", error);
    return structuredClone(defaultSettings);
  }
}

export async function saveAISettings(settings: AISettings): Promise<AISettings> {
  const sanitized = mergeWithDefaults(settings);

  await prisma.siteSetting.upsert({
    where: { key: AI_SETTINGS_KEY },
    update: {
      value: JSON.stringify(sanitized),
      group_name: "ai",
      updated_at: new Date(),
    },
    create: {
      key: AI_SETTINGS_KEY,
      value: JSON.stringify(sanitized),
      group_name: "ai",
    },
  });

  return sanitized;
}

export function getProviderConfig(
  settings: AISettings,
  provider?: AIProvider
): AIProviderSettings {
  const target = provider ?? settings.defaultProvider;
  return settings.providers[target];
}

