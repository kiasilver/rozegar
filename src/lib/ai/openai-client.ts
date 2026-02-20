import OpenAI from "openai";

/**
 * @deprecated استفاده از این فایل توصیه نمی‌شود
 * لطفاً از getAISettings() و getProviderConfig() استفاده کنید
 * و OpenAI instance را خودتان با API key از دیتابیس بسازید
 */
export function createOpenAIClient(apiKey: string): OpenAI {
  if (!apiKey) {
    throw new Error("OpenAI API key is required. Please set it in /admin/setting/ai");
  }
  return new OpenAI({
    apiKey: apiKey,
  });
}
