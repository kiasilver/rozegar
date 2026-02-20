export type AIProvider = "huggingface" | "cursor" | "custom" | "openai" | "backboard" | "gemini";

export type AIModelTier = "free" | "limited" | "paid";

export interface AIProviderSettings {
  apiKey?: string; // اختیاری - برای HuggingFace می‌تواند خالی باشد (رایگان)
  model: string;
  enabled: boolean;
  label?: string;
  isLimitedFree?: boolean;
  notes?: string;
  repository?: string; // برای Cursor Agent - اختیاری
  endpoint?: string; // برای Custom AI و Backboard - endpoint URL
  assistantId?: string; // برای Backboard - ID Assistant (اختیاری)
}

export interface AISettings {
  defaultProvider: AIProvider;
  fallbackProvider?: AIProvider | null; // Provider برای fallback (اختیاری)
  enableFallback?: boolean; // فعال/غیرفعال کردن fallback mechanism
  providers: Record<AIProvider, AIProviderSettings>;
  imageApis?: {
    unsplash?: string;
    pexels?: string;
  };
}

export interface AIModelSuggestion {
  provider: AIProvider;
  value: string;
  label: string;
  tier: AIModelTier;
  description: string;
  limitedUntil?: string;
}

