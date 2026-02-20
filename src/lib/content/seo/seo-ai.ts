/**
 * SEO AI - ترکیب الگوریتم + AI برای تولید خودکار SEO
 */

import { analyzeSEO } from "./seo-algorithm";
import type { SEOAnalysis } from "./seo-algorithm";

interface SEOGenerationOptions {
  useAI?: boolean;
  aiProvider?: "huggingface" | "cursor" | "backboard" | "openai" | "gemini";
  language?: "fa" | "en";
  model?: string;
  apiKey?: string;
  useAgentAnalysis?: boolean; // استفاده از AI Agent برای تحلیل دقیق title
}

interface GeneratedSEO {
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  suggestions: string[];
  analysis: SEOAnalysis;
}

/**
 * تولید SEO با ترکیب الگوریتم + AI
 * اگر useAgentAnalysis=true باشد، از AI Agent برای تحلیل دقیق title استفاده می‌شود
 */
export async function generateSEO(
  title: string,
  content: string,
  existingKeywords: string[] = [],
  options: SEOGenerationOptions = {}
): Promise<GeneratedSEO> {
  const {
    useAI = true,
    language = "fa",
    aiProvider = "huggingface",
    model,
    apiKey,
    useAgentAnalysis = false, // استفاده از AI Agent برای تحلیل دقیق
  } = options;

  // اگر useAgentAnalysis فعال باشد، از AI Agent برای تحلیل دقیق استفاده کن
  if (useAgentAnalysis && useAI) {
    try {
      return await generateSEOWithAgent(title, content, existingKeywords, {
        language,
        aiProvider: aiProvider === "cursor" ? "cursor" : "huggingface",
        model,
        apiKey,
      });
    } catch (error) {
      console.error("⚠️ خطا در تحلیل SEO با AI Agent، استفاده از روش پیش‌فرض:", error);
      // ادامه با روش پیش‌فرض
    }
  }

  const resolvedProvider = aiProvider;
  const providerApiKey = apiKey;
  const providerModel = model;

  // تحلیل SEO با الگوریتم
  const analysis = analyzeSEO(title, content, "", existingKeywords);
  
  // استخراج کلمات کلیدی اصلی از title
  const titleWords = title
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 5);

  // استخراج LSI Keywords بهتر
  const enhancedLSI = extractEnhancedLSIKeywords(content, title, existingKeywords, language);
  
  // ترکیب کلمات کلیدی
  const mainKeywords = existingKeywords.length > 0 
    ? existingKeywords.slice(0, 3)
    : titleWords.slice(0, 3);
  
  const allKeywords = [
    ...mainKeywords,
    ...enhancedLSI.slice(0, 7)
  ].filter((kw, index, self) => self.indexOf(kw) === index); // حذف تکراری‌ها

  // تولید Meta Title بهینه (55-60 کاراکتر)
  let metaTitle = generateOptimizedMetaTitle(title, mainKeywords, language);
  
  // تولید Meta Description بهینه (140-155 کاراکتر)
  let metaDescription = "";
  if (useAI) {
    try {
      if (resolvedProvider === "backboard") {
        // استفاده از Backboard برای تولید Meta Description
        metaDescription = await generateOptimizedDescriptionWithBackboard(
          title,
          content,
          mainKeywords,
          language,
          providerApiKey,
          providerModel
        );
      } else if (resolvedProvider === "openai" || resolvedProvider === "cursor") {
        metaDescription = await generateOptimizedDescriptionWithOpenAI(
          title,
          content,
          mainKeywords,
          language,
          providerApiKey,
          providerModel
        );
      } else {
        // HuggingFace یا سایر providers
        metaDescription = await generateDescriptionWithHuggingFace(
          content,
          language,
          providerApiKey,
          providerModel
        );
        // بهینه‌سازی طول
        metaDescription = optimizeMetaDescription(metaDescription, mainKeywords, language);
      }
    } catch (error) {
      console.error("AI generation failed, using algorithm:", error);
      metaDescription = generateOptimizedDescriptionWithAlgorithm(content, mainKeywords, language);
    }
  } else {
    metaDescription = generateOptimizedDescriptionWithAlgorithm(content, mainKeywords, language);
  }

  // تولید Meta Keywords (ترکیب کلمات کلیدی اصلی + LSI)
  const metaKeywords = [
    ...mainKeywords,
    ...enhancedLSI.slice(0, 10)
  ].filter((kw, index, self) => self.indexOf(kw) === index).join(", ");

  return {
    meta_title: metaTitle,
    meta_description: metaDescription,
    meta_keywords: metaKeywords,
    suggestions: analysis.suggestions,
    analysis,
  };
}

/**
 * تولید SEO با AI Agent - تحلیل دقیق title و تولید SEO حرفه‌ای
 */
async function generateSEOWithAgent(
  title: string,
  content: string,
  existingKeywords: string[] = [],
  options: {
    language?: "fa" | "en";
    aiProvider?: "huggingface" | "cursor";
    model?: string;
    apiKey?: string;
  }
): Promise<GeneratedSEO> {
  const {
    language = "fa",
    aiProvider = "huggingface",
    model,
    apiKey,
  } = options;

  // دریافت تنظیمات AI اگر apiKey داده نشده باشد
  let finalApiKey = apiKey;
  let finalProvider = aiProvider;
  let finalModel = model;

  if (!finalApiKey) {
    try {
      const { getAISettings, getProviderConfig } = await import('@/lib/ai/ai-settings');
      const aiSettings = await getAISettings();
      const providers: Array<"cursor" | "huggingface"> = ["cursor", "huggingface"];
      
      // پیدا کردن اولین provider فعال با API key
      for (const provider of providers) {
        const config = getProviderConfig(aiSettings, provider);
        if (config?.enabled && config?.apiKey) {
          finalProvider = provider;
          finalApiKey = config.apiKey;
          finalModel = config.model || finalModel;
          break;
        }
      }
      
      if (!finalApiKey) {
        throw new Error("هیچ provider AI فعال با API key یافت نشد");
      }
    } catch (error) {
      throw new Error(`خطا در دریافت تنظیمات AI: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  const prompt = language === "fa"
    ? `شما یک متخصص SEO حرفه‌ای هستید. عنوان و محتوای زیر را تحلیل کنید و SEO کامل و بهینه تولید کنید.

**عنوان خبر:**
${title}

**محتوای خبر:**
${content.substring(0, 2000)}

**کلمات کلیدی موجود:**
${existingKeywords.length > 0 ? existingKeywords.join(", ") : "خودکار استخراج شود"}

**لطفاً JSON زیر را کامل کنید:**

{
  "meta_title": "Meta Title بهینه (دقیقاً 55-60 کاراکتر، کلمات کلیدی اصلی در ابتدا)",
  "meta_description": "Meta Description جذاب و کامل (دقیقاً 140-155 کاراکتر، شامل جزئیات مهم خبر)",
  "main_keywords": ["کلمه کلیدی 1", "کلمه کلیدی 2", "کلمه کلیدی 3"],
  "lsi_keywords": [
    "LSI Keyword 1",
    "LSI Keyword 2",
    "LSI Keyword 3",
    "LSI Keyword 4",
    "LSI Keyword 5",
    "LSI Keyword 6",
    "LSI Keyword 7",
    "LSI Keyword 8",
    "LSI Keyword 9",
    "LSI Keyword 10"
  ],
  "long_tail_keywords": [
    "Long-tail keyword 1",
    "Long-tail keyword 2",
    "Long-tail keyword 3"
  ],
  "google_news_keywords": [
    "Google News keyword 1",
    "Google News keyword 2",
    "Google News keyword 3"
  ]
}

**مهم:**
- Meta Title باید دقیقاً 55-60 کاراکتر باشد
- Meta Description باید دقیقاً 140-155 کاراکتر باشد
- کلمات کلیدی اصلی را از title استخراج کن
- LSI Keywords باید مرتبط و معنادار باشند
- فقط JSON برگردان، بدون توضیحات اضافی`
    : `You are a professional SEO expert. Analyze the following title and content and generate complete, optimized SEO.

**News Title:**
${title}

**News Content:**
${content.substring(0, 2000)}

**Existing Keywords:**
${existingKeywords.length > 0 ? existingKeywords.join(", ") : "Auto-extract"}

**Please complete the following JSON:**

{
  "meta_title": "Optimized Meta Title (exactly 55-60 characters, main keywords at the beginning)",
  "meta_description": "Engaging and complete Meta Description (exactly 140-155 characters, including important news details)",
  "main_keywords": ["Keyword 1", "Keyword 2", "Keyword 3"],
  "lsi_keywords": [
    "LSI Keyword 1",
    "LSI Keyword 2",
    "LSI Keyword 3",
    "LSI Keyword 4",
    "LSI Keyword 5",
    "LSI Keyword 6",
    "LSI Keyword 7",
    "LSI Keyword 8",
    "LSI Keyword 9",
    "LSI Keyword 10"
  ],
  "long_tail_keywords": [
    "Long-tail keyword 1",
    "Long-tail keyword 2",
    "Long-tail keyword 3"
  ],
  "google_news_keywords": [
    "Google News keyword 1",
    "Google News keyword 2",
    "Google News keyword 3"
  ]
}

**Important:**
- Meta Title must be exactly 55-60 characters
- Meta Description must be exactly 140-155 characters
- Extract main keywords from title
- LSI Keywords must be relevant and meaningful
- Return only JSON, no additional explanations`;

  let response: string;
  
  try {
    if (finalProvider === "cursor") {
      // استفاده از Cursor API
      const cursorResponse = await fetch("https://api.cursor.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${finalApiKey}`,
        },
        body: JSON.stringify({
          model: finalModel || "auto",
          messages: [
            {
              role: "system",
              content: language === "fa"
                ? "شما یک متخصص SEO حرفه‌ای هستید. فقط JSON معتبر برمی‌گردانید."
                : "You are a professional SEO expert. You only return valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!cursorResponse.ok) {
        throw new Error(`Cursor API error: ${cursorResponse.status}`);
      }

      const cursorData = await cursorResponse.json();
      response = cursorData.choices?.[0]?.message?.content || "";
    } else if (finalProvider === "huggingface") {
      // HuggingFace برای SEO مناسب نیست - استفاده از Cursor Agent
      throw new Error("HuggingFace برای تولید SEO مناسب نیست. لطفاً از Cursor Agent استفاده کنید.");
    } else {
      throw new Error(`Provider نامعتبر: ${finalProvider}`);
    }

    // استخراج JSON از پاسخ
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("پاسخ AI معتبر نیست - JSON پیدا نشد");
    }

    const seoData = JSON.parse(jsonMatch[0]);

    // اطمینان از طول صحیح
    let metaTitle = seoData.meta_title || title;
    if (metaTitle.length > 60) {
      metaTitle = metaTitle.substring(0, 57) + "...";
    } else if (metaTitle.length < 55) {
      // اگر خیلی کوتاه است، کلمه کلیدی اضافه کن
      const mainKeyword = seoData.main_keywords?.[0] || "";
      if (mainKeyword && (metaTitle + " | " + mainKeyword).length <= 60) {
        metaTitle = `${metaTitle} | ${mainKeyword}`;
      }
    }

    let metaDescription = seoData.meta_description || "";
    metaDescription = optimizeMetaDescription(metaDescription, seoData.main_keywords || [], language);

    // ترکیب کلمات کلیدی
    const allKeywords = [
      ...(seoData.main_keywords || []),
      ...(seoData.lsi_keywords || []).slice(0, 7),
    ].filter((kw, index, self) => self.indexOf(kw) === index);

    const metaKeywords = allKeywords.join(", ");

    // تحلیل SEO با الگوریتم برای suggestions
    const analysis = analyzeSEO(metaTitle, content, metaDescription, allKeywords);

    return {
      meta_title: metaTitle,
      meta_description: metaDescription,
      meta_keywords: metaKeywords,
      suggestions: analysis.suggestions,
      analysis,
    };
  } catch (error) {
    console.error("❌ خطا در تولید SEO با AI Agent:", error);
    throw error;
  }
}

/**
 * تولید Meta Description با HuggingFace (رایگان)
 */
async function generateDescriptionWithHuggingFace(
  content: string,
  language: "fa" | "en",
  apiKey?: string,
  customModel?: string
): Promise<string> {
  try {
    // فقط از apiKey پارامتر استفاده کن، نه از env
    // برای HuggingFace، API key اختیاری است
    const apiToken = apiKey;

    // استفاده از facebook/bart-large-cnn که در Inference API پشتیبانی می‌شود
    // مدل m3hrdadfi/bert2bert-fa-wiki-summary در Inference API در دسترس نیست
    const model = customModel || "facebook/bart-large-cnn";

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    // فقط اگر API key داریم، Authorization header اضافه کن
    if (apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }
    
    // استفاده از api-inference اول (اگر 410 داد، از router استفاده کن)
    const encodedModel = encodeURIComponent(model);
    let response = await fetch(
      `https://api-inference.huggingface.co/models/${encodedModel}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          inputs: content.substring(0, 1000), // محدود کردن طول برای HuggingFace
        }),
      }
    );
    
    // اگر 410 داد (deprecated) یا 404 داد، از router استفاده کن
    if (response.status === 410 || response.status === 404) {
      response = await fetch(
        `https://router.huggingface.co/models/${encodedModel}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            inputs: content.substring(0, 1000),
          }),
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      if (response.status === 404) {
        throw new Error(`HuggingFace API error: Model "${model}" not found (404). This model may not be available in Inference API. Try using a different model like "facebook/bart-large-cnn" for English.`);
      } else if (response.status === 503) {
        throw new Error(`HuggingFace API error: Model is loading (503). Please wait a moment and try again.`);
      }
      throw new Error(`HuggingFace API error (${response.status}): ${errorText.substring(0, 100)}`);
    }

    const result = await response.json();
    let summary = "";

    if (typeof result === "string") {
      summary = result;
    } else if (Array.isArray(result) && result[0]?.summary_text) {
      summary = result[0].summary_text;
    } else if (result[0]?.generated_text) {
      summary = result[0].generated_text;
    } else {
      throw new Error("Unexpected response format");
    }

    // محدود کردن به 160 کاراکتر
    return summary.substring(0, 157).trim() + (summary.length > 157 ? "..." : "");
  } catch (error) {
    console.error("HuggingFace generation error:", error);
    throw error;
  }
}

/**
 * تولید Meta Title بهینه (55-60 کاراکتر)
 */
export function generateOptimizedMetaTitle(
  title: string,
  mainKeywords: string[],
  language: "fa" | "en"
): string {
  // حذف HTML tags
  let cleanTitle = title.replace(/<[^>]*>/g, " ").trim();
  
  // اگر title خیلی طولانی است، آن را کوتاه کن
  if (cleanTitle.length > 60) {
    // سعی کن جمله کامل را نگه داری
    const sentences = cleanTitle.split(/[.:]\s+/);
    if (sentences.length > 0 && sentences[0].length <= 60) {
      cleanTitle = sentences[0];
    } else {
      // برش کن اما در کلمه کامل
      const words = cleanTitle.split(/\s+/);
      let result = "";
      for (const word of words) {
        if ((result + " " + word).length <= 57) {
          result += (result ? " " : "") + word;
        } else {
          break;
        }
      }
      cleanTitle = result || cleanTitle.substring(0, 57);
    }
  }
  
  // اگر title خیلی کوتاه است و keywords داریم، اضافه کن
  if (cleanTitle.length < 50 && mainKeywords.length > 0) {
    const keywordToAdd = mainKeywords[0];
    const newTitle = `${cleanTitle} | ${keywordToAdd}`;
    if (newTitle.length <= 60) {
      cleanTitle = newTitle;
    }
  }
  
  // اطمینان از محدوده 55-60 کاراکتر
  if (cleanTitle.length < 55) {
    // اگر خیلی کوتاه است، سعی کن کلمه کلیدی اضافه کنی
    if (mainKeywords.length > 0) {
      const keywordToAdd = mainKeywords[0];
      const newTitle = `${cleanTitle} | ${keywordToAdd}`;
      if (newTitle.length <= 60) {
        cleanTitle = newTitle;
      }
    }
  }
  
  // محدود کردن به 60 کاراکتر
  if (cleanTitle.length > 60) {
    cleanTitle = cleanTitle.substring(0, 57) + "...";
  }
  
  return cleanTitle;
}

/**
 * تولید Meta Description بهینه با Backboard (140-155 کاراکتر)
 */
async function generateOptimizedDescriptionWithBackboard(
  title: string,
  content: string,
  mainKeywords: string[],
  language: "fa" | "en",
  apiKey?: string,
  customModel?: string
): Promise<string> {
  try {
    if (!apiKey) {
      throw new Error("Backboard API key not configured");
    }

    const { sendMessageToBackboard } = await import('@/lib/automation/telegram/backboard-helper');
    
    const keywordsText = mainKeywords.join(", ");
    const prompt =
      language === "fa"
        ? `یک meta description حرفه‌ای و جذاب برای مقاله خبری زیر بنویس که:
- دقیقاً بین 140 تا 155 کاراکتر باشد
- شامل کلمات کلیدی اصلی باشد: ${keywordsText}
- جذاب و ترغیب‌کننده باشد
- شامل جزئیات مهم خبر باشد

عنوان: ${title}

محتوا: ${content.substring(0, 800)}

Meta Description (140-155 کاراکتر):`
        : `Write a professional and engaging meta description for the following news article that:
- Is exactly between 140-155 characters
- Includes main keywords: ${keywordsText}
- Is engaging and compelling
- Includes important news details

Title: ${title}

Content: ${content.substring(0, 800)}

Meta Description (140-155 characters):`;

    const systemPrompt = language === "fa"
      ? "شما یک متخصص SEO خبری هستید که meta description های بهینه و جذاب می‌نویسید. همیشه بین 140-155 کاراکتر بنویس."
      : "You are a news SEO expert who writes optimized and engaging meta descriptions. Always write between 140-155 characters.";

    const description = await sendMessageToBackboard(
      prompt,
      {
        apiKey,
        endpoint: 'https://app.backboard.io/api',
        model: customModel || 'gpt-3.5-turbo',
      },
      systemPrompt
    );

    if (!description) {
      throw new Error("Backboard returned empty response");
    }

    // بهینه‌سازی طول
    const optimized = optimizeMetaDescription(description, mainKeywords, language);
    
    return optimized;
  } catch (error) {
    console.error("Backboard generation error:", error);
    throw error;
  }
}

/**
 * تولید Meta Description بهینه با OpenAI (140-155 کاراکتر)
 */
async function generateOptimizedDescriptionWithOpenAI(
  title: string,
  content: string,
  mainKeywords: string[],
  language: "fa" | "en",
  apiKey?: string,
  customModel?: string
): Promise<string> {
  try {
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const keywordsText = mainKeywords.join(", ");
    const prompt =
      language === "fa"
        ? `یک meta description حرفه‌ای و جذاب برای مقاله خبری زیر بنویس که:
- دقیقاً بین 140 تا 155 کاراکتر باشد
- شامل کلمات کلیدی اصلی باشد: ${keywordsText}
- جذاب و ترغیب‌کننده باشد
- شامل جزئیات مهم خبر باشد

عنوان: ${title}

محتوا: ${content.substring(0, 800)}

Meta Description (140-155 کاراکتر):`
        : `Write a professional and engaging meta description for the following news article that:
- Is exactly between 140-155 characters
- Includes main keywords: ${keywordsText}
- Is engaging and compelling
- Includes important news details

Title: ${title}

Content: ${content.substring(0, 800)}

Meta Description (140-155 characters):`;

    const completion = await openai.chat.completions.create({
      model: customModel || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            language === "fa"
              ? "شما یک متخصص SEO خبری هستید که meta description های بهینه و جذاب می‌نویسید. همیشه بین 140-155 کاراکتر بنویس."
              : "You are a news SEO expert who writes optimized and engaging meta descriptions. Always write between 140-155 characters.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 80,
      temperature: 0.7,
    });

    let description = completion.choices[0]?.message?.content?.trim() || "";
    
    // بهینه‌سازی طول
    description = optimizeMetaDescription(description, mainKeywords, language);
    
    return description;
  } catch (error) {
    console.error("OpenAI generation error:", error);
    throw error;
  }
}

/**
 * بهینه‌سازی طول Meta Description (140-155 کاراکتر)
 */
export function optimizeMetaDescription(
  description: string,
  mainKeywords: string[],
  language: "fa" | "en"
): string {
  // حذف HTML
  let cleanDesc = description.replace(/<[^>]*>/g, " ").trim();
  
  // اگر خیلی کوتاه است، سعی کن کامل کنی
  if (cleanDesc.length < 140) {
    // اگر keywords داریم و در description نیستند، اضافه کن
    const missingKeywords = mainKeywords.filter(
      kw => !cleanDesc.toLowerCase().includes(kw.toLowerCase())
    );
    if (missingKeywords.length > 0) {
      const keywordToAdd = missingKeywords[0];
      const newDesc = `${cleanDesc} ${language === "fa" ? "|" : "|"} ${keywordToAdd}`;
      if (newDesc.length <= 155) {
        cleanDesc = newDesc;
      }
    }
    
    // اگر هنوز کوتاه است، اضافه کن
    if (cleanDesc.length < 140) {
      const suffix = language === "fa" ? " آخرین جزئیات را اینجا بخوانید." : " Read more details here.";
      const newDesc = cleanDesc + suffix;
      if (newDesc.length <= 155) {
        cleanDesc = newDesc;
      }
    }
  }
  
  // اگر خیلی طولانی است، کوتاه کن
  if (cleanDesc.length > 155) {
    // سعی کن در جمله کامل قطع کنی
    const sentences = cleanDesc.split(/[.!?]\s+/);
    let result = "";
    for (const sentence of sentences) {
      if ((result + sentence + ". ").length <= 152) {
        result += (result ? ". " : "") + sentence;
      } else {
        break;
      }
    }
    if (result) {
      cleanDesc = result + ".";
    } else {
      // اگر نمی‌توانی، برش کن
      cleanDesc = cleanDesc.substring(0, 152) + "...";
    }
  }
  
  return cleanDesc;
}

/**
 * تولید Meta Description بهینه با الگوریتم (140-155 کاراکتر)
 */
export function generateOptimizedDescriptionWithAlgorithm(
  content: string,
  mainKeywords: string[],
  language: "fa" | "en"
): string {
  // حذف HTML
  const textContent = content.replace(/<[^>]*>/g, " ").trim();
  
  // پیدا کردن جمله اول که شامل کلمه کلیدی باشد
  const sentences = textContent.split(/[.!?]\s+/);
  let bestSentence = "";
  
  // اول سعی کن جمله‌ای پیدا کنی که شامل keyword باشد
  for (const sentence of sentences) {
    if (mainKeywords.some(kw => sentence.toLowerCase().includes(kw.toLowerCase()))) {
      if (sentence.length >= 140 && sentence.length <= 155) {
        return sentence;
      }
      if (sentence.length > 155) {
        // کوتاه کن
        return optimizeMetaDescription(sentence, mainKeywords, language);
      }
      if (sentence.length > bestSentence.length) {
        bestSentence = sentence;
      }
    }
  }
  
  // اگر جمله مناسب پیدا نشد، از bestSentence استفاده کن
  if (bestSentence) {
    return optimizeMetaDescription(bestSentence, mainKeywords, language);
  }
  
  // اگر هیچ جمله‌ای پیدا نشد، از ابتدای محتوا استفاده کن
  let description = textContent.substring(0, 155);
  
  // اطمینان از اینکه در کلمه کامل قطع می‌شود
  const lastSpace = description.lastIndexOf(" ");
  if (lastSpace > 140) {
    description = description.substring(0, lastSpace);
  }
  
  return optimizeMetaDescription(description, mainKeywords, language);
}

/**
 * استخراج LSI Keywords بهتر
 */
export function extractEnhancedLSIKeywords(
  content: string,
  title: string,
  existingKeywords: string[],
  language: "fa" | "en"
): string[] {
  const cleanText = (content + " " + title).replace(/<[^>]*>/g, " ");
  const words = cleanText
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 3);
  
  // کلمات رایج که باید نادیده گرفته شوند
  const stopWords = new Set([
    "این", "که", "از", "به", "در", "با", "برای", "یا", "هم", "همه",
    "یک", "دو", "سه", "چهار", "پنج", "است", "بود", "شد", "می", "را",
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did"
  ]);
  
  // شمارش کلمات (بدون stop words و existing keywords)
  const wordCount: Record<string, number> = {};
  words.forEach((word) => {
    if (
      !stopWords.has(word) &&
      !existingKeywords.some((kw) => 
        word.includes(kw.toLowerCase()) || kw.toLowerCase().includes(word)
      )
    ) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  // برگرداندن 15 کلمه پرتکرار (برای انتخاب بهتر)
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word);
}

/**
 * تولید Meta Description با الگوریتم (بدون AI)
 */
function generateDescriptionWithAlgorithm(
  content: string,
  keywords: string[]
): string {
  // حذف HTML
  const textContent = content.replace(/<[^>]*>/g, " ").trim();

  // اگر محتوا کوتاه است
  if (textContent.length <= 160) {
    return textContent;
  }

  // پیدا کردن جمله اول که شامل کلمه کلیدی باشد
  const sentences = textContent.split(/[.!?]\s+/);
  const keywordSentence = sentences.find((sentence) =>
    keywords.some((kw) => sentence.toLowerCase().includes(kw.toLowerCase()))
  );

  if (keywordSentence && keywordSentence.length <= 160) {
    return keywordSentence;
  }

  // در غیر این صورت، 160 کاراکتر اول
  return textContent.substring(0, 157) + "...";
}

/**
 * تولید Structured Data (JSON-LD) - NewsArticle
 */
export async function generateStructuredData(
  title: string,
  description: string,
  image: string,
  url: string,
  publishedAt?: Date,
  modifiedAt?: Date,
  author?: { name: string; url?: string },
  categories?: string[]
) {
  // دریافت تنظیمات domain از database
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  try {
    const { getUnifiedSettings } = await import('@/lib/automation/undefined-rss/unified-rss-processor');
    const rssSettings = await getUnifiedSettings();
    baseUrl = rssSettings?.site_url || baseUrl;
  } catch (error) {
    // ignore
  }
  
  const fullImageUrl = image.startsWith("http") ? image : `${baseUrl}${image}`;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: description,
    image: fullImageUrl,
    datePublished: publishedAt?.toISOString(),
    dateModified: modifiedAt?.toISOString() || publishedAt?.toISOString(),
    author: author
      ? {
          "@type": "Person",
          name: author.name,
          url: author.url,
        }
      : {
          "@type": "Person",
          name: "تحریریه",
        },
    publisher: {
      "@type": "Organization",
      name: "سایت خبری",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    articleSection: categories?.[0],
    keywords: categories?.join(", "),
  };
}

/**
 * تولید FAQ Structured Data (JSON-LD)
 */
export function generateFAQStructuredData(
  title: string,
  content: string,
  language: "fa" | "en" = "fa"
): any {
  // استخراج سوالات و پاسخ‌ها از محتوا
  // این یک نسخه ساده است - می‌تواند با AI بهبود یابد
  const questions: Array<{ question: string; answer: string }> = [];
  
  // پیدا کردن الگوهای سوال-پاسخ در محتوا
  // برای مثال: "سوال: ... پاسخ: ..." یا "؟" و "."
  const qaPatterns = [
    /(?:سوال|سؤال|پرسش)[:：]\s*(.+?)(?:پاسخ|جواب)[:：]\s*(.+?)(?=\n|$)/gi,
    /(.+?)\?[\s\n]+(.+?)(?=\n\n|\n[A-Z]|$)/gi,
  ];
  
  for (const pattern of qaPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[2] && match[1].length < 200 && match[2].length < 500) {
        questions.push({
          question: match[1].trim().replace(/<[^>]*>/g, ""),
          answer: match[2].trim().replace(/<[^>]*>/g, ""),
        });
      }
    }
  }
  
  // اگر سوال-پاسخ پیدا نشد، از title و content سوال-پاسخ بساز
  if (questions.length === 0) {
    // استخراج کلمات کلیدی از title
    const titleWords = title
      .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 3);
    
    if (titleWords.length > 0) {
      // ساخت سوال-پاسخ ساده
      const mainKeyword = titleWords[0];
      const contentText = content.replace(/<[^>]*>/g, " ").substring(0, 300).trim();
      
      questions.push({
        question: language === "fa" 
          ? `چقدر ${mainKeyword} در این خبر ذکر شده است؟`
          : `How much ${mainKeyword} is mentioned in this news?`,
        answer: contentText || title,
      });
    }
  }
  
  if (questions.length === 0) {
    return null; // اگر سوال-پاسخی نیست، null برگردان
  }
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.answer,
      },
    })),
  };
}


/**
 * پیشنهاد بهبود SEO
 */
export function getSEORecommendations(analysis: SEOAnalysis): string[] {
  const recommendations: string[] = [];

  if (analysis.score < 50) {
    recommendations.push("⚠️ SEO شما نیاز به بهبود جدی دارد.");
  } else if (analysis.score < 70) {
    recommendations.push("⚠️ SEO شما قابل قبول است اما می‌تواند بهتر شود.");
  } else if (analysis.score < 90) {
    recommendations.push("✅ SEO شما خوب است اما هنوز جا برای بهبود دارد.");
  } else {
    recommendations.push("🎉 SEO شما عالی است!");
  }

  // اضافه کردن پیشنهادات از تحلیل
  recommendations.push(...analysis.suggestions);

  return [...new Set(recommendations)]; // حذف تکراری‌ها
}

