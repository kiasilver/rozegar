/**
 * Telegram AI Agent
 * Summarizes news for Telegram using AI.
 */

// --- Cursor Agent types & helpers (previously in rss-content-generation/cursor-agent) ---

type CursorAgent = { id: string; status: string;[key: string]: any };
type CursorMessage = { type: string; text: string;[key: string]: any };

const CURSOR_POLL_INTERVAL = 3000;
const CURSOR_MAX_WAIT = 120000;

async function waitForAgentCompletion(agentId: string, apiKey: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < CURSOR_MAX_WAIT) {
    const res = await fetch(`https://api.cursor.com/v0/agents/${agentId}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` },
    });
    if (!res.ok) throw new Error(`Cursor poll error: ${res.statusText}`);
    const data: CursorAgent = await res.json();
    if (data.status === 'completed' || data.status === 'failed') return;
    await new Promise((r) => setTimeout(r, CURSOR_POLL_INTERVAL));
  }
  throw new Error('Cursor agent timed out');
}

async function getAgentConversation(
  agentId: string,
  apiKey: string
): Promise<{ messages: CursorMessage[] }> {
  const res = await fetch(`https://api.cursor.com/v0/agents/${agentId}/conversation`, {
    headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` },
  });
  if (!res.ok) throw new Error(`Cursor conversation error: ${res.statusText}`);
  return res.json();
}

// --- End Cursor Agent helpers ---

const CURSOR_API_BASE = "https://api.cursor.com/v0";

// Helper function for base64 encoding
function base64Encode(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str).toString("base64");
  } else {
    return btoa(str);
  }
}

/**
 * ╪¡╪░┘ü ┘å╪º┘à ╪«╪¿╪▒┌»╪▓╪º╪▒█îΓÇî┘ç╪º ┘ê ┌»╪▓╪º╪▒╪┤┌»╪▒╪º┘å ╪º╪▓ ┘à╪¬┘å
 */
/**
 * ╪¡╪░┘ü ┌⌐╪º┘à┘ä ╪¬┌»ΓÇî┘ç╪º█î <a> ┘ê ╪º┘ä┌»┘ê┘ç╪º█î href ╪º╪▓ ┘à╪¬┘å
 */
function removeAllAnchorTags(text: string): string {
  let cleaned = text;

  // Remove all full <a> tags
  cleaned = cleaned.replace(/<a[^>]*href\s*=\s*["'][^"']*["'][^>]*>(.*?)<\/a>/gi, '$1');
  cleaned = cleaned.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
  cleaned = cleaned.replace(/<a[^>]*\/?>/gi, '');
  cleaned = cleaned.replace(/<\/a>/gi, '');

  // Remove "a href=..." patterns that might lack brackets
  cleaned = cleaned.replace(/\ba\s+href\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\ba\s+href\s*=\s*['][^']*[']/gi, '');
  cleaned = cleaned.replace(/^a\s+href\s*=\s*["'][^"']*["']/gim, '');
  cleaned = cleaned.replace(/^a\s+href\s*=\s*['][^']*[']/gim, '');
  cleaned = cleaned.replace(/a\s+href\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/a\s+href\s*=\s*['][^']*[']/gi, '');

  // Remove lonely href= attributes
  cleaned = cleaned.replace(/href\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/href\s*=\s*['][^']*[']/gi, '');

  return cleaned;
}

/**
 * Clean news content from HTML and extra text
 */
export function cleanNewsContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const originalLength = content.length;
  let cleaned = content.trim();
  if (!cleaned) return '';

  // Remove all <a> tags and hrefs
  cleaned = removeAllAnchorTags(cleaned);

  // Remove other HTML tags - keep content
  cleaned = cleaned.replace(/<(b|strong|i|em|span|u|small|mark|del|ins|sub|sup)[^>]*>(.*?)<\/\1>/gi, '$2');
  cleaned = cleaned.replace(/<(div|p|h[1-6]|section|article|header|footer|nav|aside|main)[^>]*>/gi, ' ');
  cleaned = cleaned.replace(/<\/(div|p|h[1-6]|section|article|header|footer|nav|aside|main)>/gi, ' ');
  cleaned = cleaned.replace(/<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)[^>]*\/?>/gi, ' ');
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // ╪¡╪░┘ü ╪¬┌»ΓÇî┘ç╪º█î ╪┤┌⌐╪│╪¬┘ç
  cleaned = cleaned.replace(/\b(a|img|div|span|p|h[1-6]|strong|b|em|i|u|small|mark|del|ins|sub|sup|br|hr|input|meta|link|area|base|col|embed|source|track|wbr|script|style|noscript|iframe|svg|video|audio|source|track|canvas|object|param|form|input|button|select|option|textarea|label|fieldset|legend|table|tr|td|th|thead|tbody|tfoot|caption|colgroup|col|ul|ol|li|dl|dt|dd|nav|header|footer|section|article|aside|main|figure|figcaption|details|summary|dialog|menu|menuitem)\s+(href|src|alt|title|class|id|style|data-|onclick|onload|onerror|type|rel|target|name|value|action|method|enctype|role|aria-)[^<>\s]*/gi, '');
  cleaned = cleaned.replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '');
  cleaned = cleaned.replace(/[<>][^<>]*/g, '');
  cleaned = cleaned.replace(/\b(href|src|alt|title|class|id|style|data-[a-z-]+)\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  cleaned = cleaned.replace(/<\/[^>]+>/g, '');
  cleaned = cleaned.replace(/<[^>]*$/g, '');
  cleaned = cleaned.replace(/^[^<]*>/g, '');

  // ╪¡╪░┘ü entity ┘ç╪º█î HTML
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&[a-z0-9#]+;/gi, ' ');

  // ╪¡╪░┘ü ┘ä█î┘å┌⌐ΓÇî┘ç╪º (URL ┘ç╪º█î ╪¿╪º┘é█îΓÇî┘à╪º┘å╪»┘ç)
  cleaned = cleaned.replace(/https?:\/\/[^\s"']+/gi, '');
  cleaned = cleaned.replace(/www\.[^\s"']+/gi, '');
  cleaned = cleaned.replace(/[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s"']*)?/gi, (match) => {
    if (match.includes('/') || match.includes('.com') || match.includes('.ir') || match.includes('.org') || match.includes('.net') || match.includes('.co')) {
      return '';
    }
    return match;
  });

  // حذف کد خبر و تاریخ
  cleaned = cleaned.replace(/کد\s*خبر\s*:?\s*[\d\u06F0-\u06F9]+/gi, '');
  cleaned = cleaned.replace(/کد\s*:?\s*[\d\u06F0-\u06F9]+/gi, '');
  cleaned = cleaned.replace(/news\s*code\s*:?\s*\d+/gi, '');
  cleaned = cleaned.replace(/\d{1,2}\s+[\u0600-\u06FF]+\s+\d{4}[،,]\s*\d{1,2}:\d{2}/g, '');
  cleaned = cleaned.replace(/\d{4}\/\d{2}\/\d{2}\s*-\s*\d{2}:\d{2}/g, '');

  // حذف مدت زمان مطالعه
  cleaned = cleaned.replace(/مدت\s+زمان\s+مطالعه.*?\d+\s+دقیقه/gi, '');
  cleaned = cleaned.replace(/زمان\s+مطالعه.*?\d+\s+دقیقه/gi, '');

  // ╪¡╪░┘ü ┘à╪¬┘åΓÇî┘ç╪º█î prompt ╪º╪▓ ┘à╪¡╪¬┘ê╪º
  cleaned = cleaned.replace(/┌⌐┘ä█î┌⌐\s+┘à┘à┘å┘ê╪╣[^\n]*/gi, '');
  cleaned = cleaned.replace(/╪¿╪▒╪º█î\s+╪»╪▒█î╪º┘ü╪¬\s+┌⌐╪º┘ä╪º╪¿╪▒┌»\s+╪¿┘ç\s+┘ç█î┌å\s+┘ä█î┘å┌⌐[^\n]*/gi, '');
  cleaned = cleaned.replace(/I\s+will\s+summarize[^\n]*/gi, '');
  cleaned = cleaned.replace(/I\s+will\s+summarize\s+the\s+provided[^\n]*/gi, '');

  // ╪¡╪░┘ü ╪│╪¬╪º╪▒┘çΓÇî┘ç╪º ┘ê ╪«╪╖┘ê╪╖ ╪¼╪»╪º┌⌐┘å┘å╪»┘ç
  cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '');
  cleaned = cleaned.replace(/[ΓöüΓöÇΓöÇΓöÇ]+/g, '');

  // ╪¡╪░┘ü ┘ü╪º╪╡┘ä┘çΓÇî┘ç╪º█î ╪º╪╢╪º┘ü█î
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/\.\.\.+$/g, '').trim();

  // ╪¿╪▒╪▒╪│█î ┘å┘ç╪º█î█î: ╪º┌»╪▒ ┘ç┘å┘ê╪▓ "a href" █î╪º "href=" ╪»╪▒ ┘à╪¬┘å ╪¿╪º┘é█î ┘à╪º┘å╪»┘ç
  if (cleaned.includes('a href') || cleaned.includes('href=')) {
    console.warn(`[Telegram:Agent:cleanNewsContent] ⚠️ WARNING: Found remaining "a href" or "href=" in content, attempting final cleanup`);
    cleaned = removeAllAnchorTags(cleaned);
    cleaned = cleaned.replace(/https?:\/\/[^\s"']+/gi, '');
    cleaned = cleaned.replace(/www\.[^\s"']+/gi, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  }

  const finalLength = cleaned.length;
  const reductionRatio = originalLength > 0 ? (1 - finalLength / originalLength) * 100 : 0;

  // ⚠️ If too much content removed (>70%), warn
  if (reductionRatio > 70 && originalLength > 500) {
    console.warn(`[Telegram:Agent:cleanNewsContent] ⚠️ WARNING: Too much content removed (${originalLength} -> ${finalLength} chars, ${reductionRatio.toFixed(1)}% reduction)`);
  }

  // ⚠️ If content became empty or too short (<10%), fallback to original
  if (finalLength === 0 || (originalLength > 500 && finalLength < originalLength * 0.1)) {
    console.warn(`[Telegram:Agent:cleanNewsContent] ⚠️ WARNING: Content too short after cleaning (${originalLength} -> ${finalLength} chars), using original content with minimal cleaning`);
    // Use original content with minimal cleaning
    let fallback = content.trim();
    fallback = removeAllAnchorTags(fallback);
    fallback = fallback.replace(/<[^>]+>/g, ' ');
    fallback = fallback.replace(/&nbsp;/g, ' ');
    fallback = fallback.replace(/&amp;/g, '&');
    fallback = fallback.replace(/&lt;/g, '<');
    fallback = fallback.replace(/&gt;/g, '>');
    fallback = fallback.replace(/&quot;/g, '"');
    fallback = fallback.replace(/&#39;/g, "'");
    fallback = fallback.replace(/&[a-z0-9#]+;/gi, ' ');
    fallback = fallback.replace(/[ \t]+/g, ' ');
    fallback = fallback.replace(/\n{3,}/g, '\n\n');
    const fallbackResult = fallback.trim() || content.substring(0, 200).trim();
    console.log(`[Telegram:Agent:cleanNewsContent] ✅ Using fallback content (${fallbackResult.length} chars)`);
    return fallbackResult;
  }

  return cleaned || content.substring(0, 200).trim();
}

/**
 * ╪¡╪░┘ü prompt ╪º╪▓ ┘╛╪º╪│╪« AI (╪│╪º╪»┘çΓÇî╪┤╪»┘ç)
 * ╪¡╪º┘ä╪º AI prompt ╪▒╪º ╪»╪▒ ┘╛╪º╪│╪« ╪«┘ê╪»╪┤ ┘å┘à█îΓÇî╪ó┘ê╪▒╪»╪î ┘ü┘é╪╖ █î┌⌐ cleanup ╪│╪º╪»┘ç
 */
function removePromptFromResponse(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let cleaned = text.trim();

  // ┘ü┘é╪╖ ╪¡╪░┘ü ╪│╪º╪»┘ç ╪«╪╖┘ê╪╖ ╪«╪º┘ä█î ╪º╪╢╪º┘ü█î
  cleaned = cleaned.replace(/^\s*\n+/g, '').replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * ╪ó┘à╪º╪»┘çΓÇî╪│╪º╪▓█î ┘à╪¡╪¬┘ê╪º ┘é╪¿┘ä ╪º╪▓ ╪º╪▒╪│╪º┘ä ╪¿┘ç Agent
 * ┘╛╪º┌⌐╪│╪º╪▓█î HTML ┘ê ┘å╪º┘à ╪«╪¿╪▒┌»╪▓╪º╪▒█îΓÇî┘ç╪º ┘é╪¿┘ä ╪º╪▓ ╪º╪▒╪│╪º┘ä
 */
function prepareContentForAgent(content: string): string {
  // 1. ╪¡╪░┘ü HTML ┘ê ┘ä█î┘å┌⌐ΓÇî┘ç╪º
  let cleaned = cleanNewsContent(content);

  // ΓÜá∩╕Å ╪¬╪║█î█î╪▒ ╪º╪│╪¬╪▒╪º╪¬┌ÿ█î: ┘å╪º┘à ╪▒╪│╪º┘å┘ç/┘à┘å╪¿╪╣ ╪▒╪º ╪º╪▓ ┘à╪¬┘å ╪¡╪░┘ü ┘å┘à█îΓÇî┌⌐┘å█î┘à
  // ╪¿┘ç ╪¼╪º█î ╪ó┘å╪î ╪¿┘ç AI ╪»╪▒ prompt ┘à█îΓÇî┌»┘ê█î█î┘à ┌⌐┘ç ┘å╪º┘à ╪▒╪│╪º┘å┘ç ╪▒╪º ╪»╪▒ ╪«┘ä╪º╪╡┘ç ┘å█î╪º┘ê╪▒╪»
  // ╪º█î┘å ╪▒╪º┘ç ╪¡┘ä ╪│╪º╪»┘çΓÇî╪¬╪▒ ┘ê ╪»┘é█î┘éΓÇî╪¬╪▒ ╪º╪│╪¬

  return cleaned;
}

/**
 * ╪º█î╪¼╪º╪» prompt █î┌⌐┘╛╪º╪▒┌å┘ç ╪¿╪▒╪º█î ┘ç┘à┘ç provider ┘ç╪º
 */
/**
 * ایجاد prompt خلاصه سازی
 */
function createSummaryPrompt(title: string, content: string, maxLength: number): string {
  const minLength = Math.max(500, Math.floor(maxLength * 0.8));

  return `تو یک ویراستار خبر حرفه‌ای برای تلگرام هستی.
وظیفه: متن خبر زیر را برای انتشار در کانال تلگرام خلاصه و بازنویسی کن.

ورودی:
عنوان: ${title || 'خبر'}
محتوا:
${content}

قوانین حیاتی:
1. **طول متن:** متن را خلاصه/بازنویسی کن که طول آن بین ${minLength} تا ${maxLength} کاراکتر باشد.
2. **ساختار:**
   - خط اول: تیتر خبر (جذاب و کوتاه) - بدون بولد کردن.
   - یک خط خالی.
   - متن خبر پاراگراف‌بندی شده.
3. **حذفیات:** 
   - نام منبع و خبرگزاری را حذف کن.
   - از نمادهای اضافه (*, -, •) استفاده نکن.
   - از "..." در پایان خبر استفاده نکن.
4. **نام اشخاص:** بار اول کامل + سمت، بعد نام خانوادگی.
5. **لحن:** رسمی، خبری، بیطرفانه.

خروجی نهایی باید فقط متن خبر باشد.`;
}

/**
 * ╪º█î╪¼╪º╪» Agent ╪│╪º╪»┘ç ╪¿╪▒╪º█î Cursor
 */
async function createSimpleAgent(
  prompt: string,
  apiKey: string,
  repository: string
): Promise<CursorAgent> {
  const requestBody: any = {
    prompt: {
      text: prompt,
    },
    source: {
      repository: repository,
      ref: 'main',
    },
    target: {
      branchName: `cursor/telegram-${Date.now()}`,
      autoCreatePr: false,
    },
  };

  const agentResponse = await fetch(`${CURSOR_API_BASE}/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${base64Encode(`${apiKey}:`)}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!agentResponse.ok) {
    const errorData = await agentResponse.json().catch(() => ({}));
    throw new Error(`Cursor API error: ${errorData.error || agentResponse.statusText}`);
  }

  return await agentResponse.json();
}

/**
 * Select AI Provider based on defaultProvider and configuration
 */
function selectAIProvider(
  defaultProvider: string,
  cursorConfig: any,
  customConfig: any,
  openaiConfig: any,
  backboardConfig: any,
  geminiConfig: any
): { provider: 'cursor' | 'custom' | 'openai' | 'backboard' | 'gemini' | null; config: any } {
  // Define providers and their conditions
  const providers: Array<{ name: 'cursor' | 'custom' | 'openai' | 'backboard' | 'gemini'; config: any; check: (config: any) => boolean }> = [];

  // Check providers according to priority
  if (defaultProvider === 'cursor') {
    providers.push(
      { name: 'cursor', config: cursorConfig, check: (c: any) => c?.enabled && c?.apiKey && c?.repository },
      { name: 'gemini', config: geminiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'openai', config: openaiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'backboard', config: backboardConfig, check: (c: any) => c?.apiKey && c?.model && c?.endpoint },
      { name: 'custom', config: customConfig, check: (c: any) => c?.apiKey && c?.endpoint },
      { name: 'cursor', config: cursorConfig, check: (c: any) => c?.apiKey && c?.repository }
    );
  } else if (defaultProvider === 'gemini') {
    providers.push(
      { name: 'gemini', config: geminiConfig, check: (c: any) => c?.enabled && c?.apiKey && c?.model },
      { name: 'openai', config: openaiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'backboard', config: backboardConfig, check: (c: any) => c?.apiKey && c?.model && c?.endpoint },
      { name: 'custom', config: customConfig, check: (c: any) => c?.apiKey && c?.endpoint },
      { name: 'cursor', config: cursorConfig, check: (c: any) => c?.apiKey && c?.repository }
    );
  } else if (defaultProvider === 'openai') {
    providers.push(
      { name: 'openai', config: openaiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'gemini', config: geminiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'backboard', config: backboardConfig, check: (c: any) => c?.apiKey && c?.model && c?.endpoint },
      { name: 'custom', config: customConfig, check: (c: any) => c?.apiKey && c?.endpoint },
      { name: 'cursor', config: cursorConfig, check: (c: any) => c?.apiKey && c?.repository }
    );
  } else if (defaultProvider === 'backboard') {
    providers.push(
      { name: 'backboard', config: backboardConfig, check: (c: any) => c?.apiKey && c?.model && c?.endpoint },
      { name: 'gemini', config: geminiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'openai', config: openaiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'custom', config: customConfig, check: (c: any) => c?.apiKey && c?.endpoint },
      { name: 'cursor', config: cursorConfig, check: (c: any) => c?.apiKey && c?.repository }
    );
  } else if (defaultProvider === 'custom') {
    providers.push(
      { name: 'custom', config: customConfig, check: (c: any) => c?.apiKey && c?.endpoint },
      { name: 'gemini', config: geminiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'openai', config: openaiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'backboard', config: backboardConfig, check: (c: any) => c?.apiKey && c?.model && c?.endpoint },
      { name: 'cursor', config: cursorConfig, check: (c: any) => c?.enabled && c?.apiKey && c?.repository },
      { name: 'cursor', config: cursorConfig, check: (c: any) => c?.apiKey && c?.repository }
    );
  } else {
    // default: cursor
    providers.push(
      { name: 'cursor', config: cursorConfig, check: (c: any) => c?.enabled && c?.apiKey && c?.repository },
      { name: 'gemini', config: geminiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'openai', config: openaiConfig, check: (c: any) => c?.apiKey && c?.model },
      { name: 'backboard', config: backboardConfig, check: (c: any) => c?.apiKey && c?.model && c?.endpoint },
      { name: 'custom', config: customConfig, check: (c: any) => c?.apiKey && c?.endpoint },
      { name: 'cursor', config: cursorConfig, check: (c: any) => c?.apiKey && c?.repository }
    );
  }

  // Find first valid provider
  for (const provider of providers) {
    if (provider.check(provider.config)) {
      return { provider: provider.name, config: provider.config };
    }
  }

  return { provider: null, config: null };
}

/**
 * Lock mechanism to serialize requests to Agent
 */
class AgentRequestLock {
  private isProcessing = false;
  private queue: Array<{
    resolve: () => void;
  }> = [];

  async acquire(): Promise<void> {
    if (!this.isProcessing) {
      this.isProcessing = true;
      console.log(`[Telegram:Agent:Lock] 🔒 Lock acquired (queue size: ${this.queue.length})`);
      return;
    }

    // If processing, queue the request
    console.log(`[Telegram:Agent:Lock] ⏳ Waiting for lock (queue size: ${this.queue.length + 1})`);
    return new Promise<void>((resolve) => {
      this.queue.push({
        resolve: resolve,
      });
    });
  }

  release(): void {
    this.isProcessing = false;

    // Process next item in queue
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.isProcessing = true;
        console.log(`[Telegram:Agent:Lock] 🔓 Lock released, processing next item (queue size: ${this.queue.length})`);
        next.resolve();
      }
    } else {
      console.log(`[Telegram:Agent:Lock] 🔓 Lock released (queue empty)`);
    }
  }
}

const agentLock = new AgentRequestLock();

/**
 * Summarize news for Telegram
 * ⚠️ Important: This function runs sequentially (one request at a time)
 */
export async function summarizeNewsForTelegram(
  fullContent: string,
  title?: string,
  maxLength: number = 1024,
  categoryName?: string,
  sourceUrl?: string
): Promise<string | null> {
  // Create unique ID for request
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // ⚠️ Important: Wait for lock to be free
  await agentLock.acquire();

  try {
    console.log(`[Telegram:Agent:${requestId}] ========== START SUMMARY GENERATION ==========`);
    console.log(`[Telegram:Agent:${requestId}] 📰 Title: "${title || 'News'}"`);
    console.log(`[Telegram:Agent:${requestId}] 🔗 Source URL: ${sourceUrl || 'N/A'}`);

    // ┘╛╪º┌⌐╪│╪º╪▓█î ┘à╪¡╪¬┘ê╪º ┘é╪¿┘ä ╪º╪▓ ╪º╪▒╪│╪º┘ä ╪¿┘ç Agent
    const cleanedContent = prepareContentForAgent(fullContent);

    console.log(`[Telegram:Agent:${requestId}] 📄 Full content length: ${fullContent.length}`);
    console.log(`[Telegram:Agent:${requestId}] 🧹 Cleaned content length: ${cleanedContent.length}`);
    console.log(`[Telegram:Agent:${requestId}] 📝 Cleaned content preview (first 500 chars): ${cleanedContent.substring(0, 500)}...`);
    console.log(`[Telegram:Agent:${requestId}] 📏 Max length requested: ${maxLength}`);

    if (cleanedContent.length <= 150) {
      console.log(`[Telegram:Agent] Content too short (${cleanedContent.length} chars), returning as-is`);
      return cleanedContent;
    }

    const { getAISettings, getProviderConfig } = await import('@/lib/ai/ai-settings');
    const aiSettings = await getAISettings();

    if (!aiSettings) {
      console.error(`[Telegram:Agent] ERROR: AI settings not found`);
      return null;
    }

    const defaultProvider = aiSettings.defaultProvider || 'cursor';
    const cursorConfig = getProviderConfig(aiSettings, 'cursor');
    const customConfig = getProviderConfig(aiSettings, 'custom');
    const openaiConfig = getProviderConfig(aiSettings, 'openai');
    const backboardConfig = getProviderConfig(aiSettings, 'backboard');
    const geminiConfig = getProviderConfig(aiSettings, 'gemini');

    // ╪º┘å╪¬╪«╪º╪¿ provider
    const { provider: aiProvider, config: aiConfig } = selectAIProvider(
      defaultProvider,
      cursorConfig,
      customConfig,
      openaiConfig,
      backboardConfig,
      geminiConfig
    );

    if (!aiProvider || !aiConfig) {
      console.error(`[Telegram:Agent] ERROR: AI is not active`);
      console.error(`[Telegram:Agent]   defaultProvider: ${defaultProvider}`);
      return null;
    }

    const apiKey = aiConfig.apiKey;
    const prompt = createSummaryPrompt(title || '╪«╪¿╪▒', cleanedContent, maxLength);
    const minLength = Math.max(500, Math.floor(maxLength * 0.8)); // ╪¡╪»╪º┘é┘ä 80% ╪º╪▓ maxLength █î╪º 500 ┌⌐╪º╪▒╪º┌⌐╪¬╪▒

    console.log(`[Telegram:Agent:${requestId}] 🤖 Provider: ${aiProvider}`);
    console.log(`[Telegram:Agent:${requestId}] 🖊️ Prompt preview (first 500 chars): ${prompt.substring(0, 500)}...`);
    console.log(`[Telegram:Agent:${requestId}] 📏 Prompt length: ${prompt.length} chars`);
    const systemPrompt = `تو یک ویراستار خبر حرفه‌ای هستی.
وظیفه تو خلاصه سازی و بازنویسی اخبار برای تلگرام است.
اصول مهم:
- حفظ صحت و دقت خبر.
- حذف حشو و مطالب تکراری.
- لحن رسمی و خبری.
- رعایت علائم نگارشی.
- عدم استفاده از "من" یا اشاره به خود.`;

    // ┘╛╪▒╪»╪º╪▓╪┤ ╪¿╪▒ ╪º╪│╪º╪│ provider
    let generatedText: string | null = null;

    if (aiProvider === 'cursor') {
      const repository = (aiConfig as any)?.repository;
      if (!repository) {
        console.error(`[Telegram:Agent] ERROR: Cursor repository not found`);
        return null;
      }

      const agent = await createSimpleAgent(prompt, apiKey, repository);
      await waitForAgentCompletion(agent.id, apiKey);
      const conversation = await getAgentConversation(agent.id, apiKey);

      const assistantMessages = conversation.messages.filter((m: CursorMessage) => m.type === "assistant_message");
      if (assistantMessages.length === 0) {
        console.error(`[Telegram:Agent:${requestId}] Γ¥î ERROR: No assistant messages found`);
        return null;
      }

      generatedText = assistantMessages[assistantMessages.length - 1].text.trim();
      console.log(`[Telegram:Agent:${requestId}] ✅ Cursor Agent response received: ${generatedText.length} chars`);
      console.log(`[Telegram:Agent:${requestId}] 📝 Response preview (first 500 chars): ${generatedText.substring(0, 500)}...`);

      // Track token usage
      try {
        const { trackTokenUsage } = await import('@/lib/ai/token-tracker');
        const estimatedInputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = Math.ceil(generatedText.length / 4);
        await trackTokenUsage({
          provider: 'cursor',
          model: 'auto',
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          operation: 'summarize',
        });
      } catch (trackError: any) {
        console.warn(`[Telegram:Agent] WARNING: Failed to track token usage: ${trackError.message}`);
      }
    } else if (aiProvider === 'custom') {
      const endpoint = (aiConfig as any)?.endpoint;
      const model = aiConfig.model || 'gpt-4o-mini';

      if (!endpoint) {
        console.error(`[Telegram:Agent] ERROR: Custom AI endpoint not found`);
        return null;
      }

      let apiEndpoint: string;
      if (endpoint.endsWith('/chat/completions')) {
        apiEndpoint = endpoint;
      } else if (endpoint.endsWith('/v1')) {
        apiEndpoint = `${endpoint}/chat/completions`;
      } else {
        apiEndpoint = `${endpoint.replace(/\/$/, '')}/v1/chat/completions`;
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: Math.min(Math.floor(maxLength * 2), 8000),
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Custom AI API error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      generatedText = data.choices?.[0]?.message?.content || "";
      if (generatedText) {
        console.log(`[Telegram:Agent:${requestId}] ✅ Custom AI response received: ${generatedText.length} chars`);
        console.log(`[Telegram:Agent:${requestId}] 📝 Response preview (first 500 chars): ${generatedText.substring(0, 500)}...`);
      }

      // Track token usage
      try {
        const { trackTokenUsage, extractOpenAITokenUsage } = await import('@/lib/ai/token-tracker');
        const tokenUsage = extractOpenAITokenUsage(data);
        await trackTokenUsage({
          provider: 'custom',
          model,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
          operation: 'summarize',
        });
      } catch (trackError: any) {
        console.warn(`[Telegram:Agent:${requestId}] WARNING: Failed to track token usage: ${trackError.message}`);
      }
    } else if (aiProvider === 'openai') {
      const model = aiConfig.model || 'gpt-3.5-turbo';

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: Math.min(Math.floor(maxLength * 2), 8000),
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      generatedText = data.choices?.[0]?.message?.content || "";
      if (generatedText) {
        console.log(`[Telegram:Agent:${requestId}] ✅ OpenAI response received: ${generatedText.length} chars`);
        console.log(`[Telegram:Agent:${requestId}] 📝 Response preview (first 500 chars): ${generatedText.substring(0, 500)}...`);
      }

      // Track token usage
      try {
        const { trackTokenUsage, extractOpenAITokenUsage } = await import('@/lib/ai/token-tracker');
        const tokenUsage = extractOpenAITokenUsage(data);
        await trackTokenUsage({
          provider: 'openai',
          model,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
          operation: 'summarize',
        });
      } catch (trackError: any) {
        console.warn(`[Telegram:Agent:${requestId}] WARNING: Failed to track token usage: ${trackError.message}`);
      }
    } else if (aiProvider === 'gemini') {
      const model = aiConfig.model || 'gemini-2.5-flash';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${systemPrompt}\n\n${prompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: Math.min(Math.floor(maxLength * 2), 8000),
              temperature: 0.7,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (generatedText) {
        console.log(`[Telegram:Agent:${requestId}] ✅ Gemini response received: ${generatedText.length} chars`);
        console.log(`[Telegram:Agent:${requestId}] 📝 Response preview (first 500 chars): ${generatedText.substring(0, 500)}...`);
      }

      // Track token usage
      try {
        const { trackTokenUsage, extractGeminiTokenUsage } = await import('@/lib/ai/token-tracker');
        const tokenUsage = extractGeminiTokenUsage(data);
        await trackTokenUsage({
          provider: 'gemini',
          model,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
          operation: 'summarize',
        });
      } catch (trackError: any) {
        console.warn(`[Telegram:Agent] Failed to track token usage: ${trackError.message}`);
      }
    } else if (aiProvider === 'backboard') {
      const endpoint = (aiConfig as any)?.endpoint || 'https://app.backboard.io/api';
      const model = aiConfig.model || 'gpt-3.5-turbo';

      if (!endpoint) {
        console.error(`[Telegram:Agent] ERROR: Backboard endpoint not found`);
        return null;
      }

      const { sendMessageToBackboard } = await import('./backboard-helper');

      try {
        generatedText = await sendMessageToBackboard(
          prompt,
          {
            apiKey,
            endpoint,
            model,
            assistantId: (aiConfig as any)?.assistantId,
          },
          systemPrompt
        );
        console.log(`[Telegram:Agent:${requestId}] ✅ Backboard response received: ${generatedText?.length || 0} chars`);
        if (generatedText) {
          console.log(`[Telegram:Agent:${requestId}] 📝 Response preview (first 500 chars): ${generatedText.substring(0, 500)}...`);
        }

        // Track token usage
        if (generatedText) {
          try {
            const { getBackboardTokenUsage } = await import('./backboard-helper');
            const tokenUsage = getBackboardTokenUsage(generatedText);
            if (tokenUsage) {
              const { trackTokenUsage } = await import('@/lib/ai/token-tracker');
              await trackTokenUsage({
                provider: 'backboard',
                model: tokenUsage.model,
                inputTokens: tokenUsage.inputTokens,
                outputTokens: tokenUsage.outputTokens,
                operation: 'summarize',
              });
            }
          } catch (trackError: any) {
            console.warn(`[Telegram:Agent] WARNING: Failed to track token usage: ${trackError.message}`);
          }
        }
      } catch (error: any) {
        console.error(`[Telegram:Agent] ERROR: Backboard API failed: ${error.message}`);
        return null;
      }
    }

    if (!generatedText || generatedText.length < 50) {
      return null;
    }

    // Post-processing Agent response
    let cleanedText = generatedText.trim();
    cleanedText = cleanedText.replace(/^---+\s*\n*/g, '').replace(/\n*---+\s*$/g, '');

    // Remove prompt from response
    cleanedText = removePromptFromResponse(cleanedText);

    // ⚠️ Remove repeated title if present
    // Only check simply:

    // 🔴 Final cleanup of HTML and links
    // ⚠️ If cleanedText is empty or too short, run cleanNewsContent
    // Since original content might be deleted too
    const beforeCleanNewsContent = cleanedText;
    if (cleanedText && cleanedText.trim().length > 0) {
      cleanedText = cleanNewsContent(cleanedText);
      console.log(`[Telegram:Agent] Before cleanNewsContent: ${beforeCleanNewsContent.length} chars, After: ${cleanedText.length} chars`);
      if (beforeCleanNewsContent.length > 0 && cleanedText.length === 0) {
        console.warn(`[Telegram:Agent] ⚠️ WARNING: cleanNewsContent removed all content! Using original text.`);
        cleanedText = beforeCleanNewsContent; // Use original if clean deleted everything
      } else if (beforeCleanNewsContent.length > cleanedText.length * 1.5) {
        console.warn(`[Telegram:Agent] ⚠️ WARNING: cleanNewsContent removed too much content (${beforeCleanNewsContent.length} -> ${cleanedText.length} chars)`);
      }
    } else {
      console.warn(`[Telegram:Agent] ⚠️ WARNING: cleanedText is empty before cleanNewsContent - skipping cleanNewsContent`);
    }

    // ⚠️ AI handles "he/she" and "I/we" (instructed in prompt)

    // Truncate to maxLength (simple)
    if (cleanedText.length > maxLength) {
      const truncated = cleanedText.substring(0, maxLength);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?')
      );

      if (lastSentenceEnd > maxLength * 0.6) {
        cleanedText = cleanedText.substring(0, lastSentenceEnd + 1).trim();
        console.log(`[Telegram:Agent] ✅ Truncated at sentence end (${lastSentenceEnd + 1} chars)`);
      } else {
        cleanedText = truncated.trim();
        console.log(`[Telegram:Agent] ✅ Truncated at maxLength (${maxLength} chars)`);
      }
    }

    cleanedText = cleanedText.replace(/\.\.\.+$/g, '').trim();

    // ⚠️ Remove incomplete last sentence
    // This happens if AI hits maxLength
    const sentences = cleanedText.split(/([.!?╪ƒ]+)/);
    if (sentences.length > 0) {
      const lastPart = sentences[sentences.length - 1].trim();
      // If last part is not a sentence end and > 20 chars
      if (lastPart && !lastPart.match(/^[.!?╪ƒ]+$/) && lastPart.length > 20) {
        // Remove last incomplete sentence
        const beforeLastSentence = sentences.slice(0, -1).join('').trim();
        if (beforeLastSentence.length > 200) { // Only if remaining is enough
          cleanedText = beforeLastSentence;
          console.log(`[Telegram:Agent:${requestId}] 🗑️ Removed incomplete last sentence: "${lastPart.substring(0, 50)}..."`);
        }
      }
    }

    console.log(`[Telegram:Agent:${requestId}] Γ£à Final summarized content length: ${cleanedText.length}`);
    console.log(`[Telegram:Agent:${requestId}] ≡ƒôä Final summarized content preview (first 500 chars): ${cleanedText.substring(0, 500)}...`);
    console.log(`[Telegram:Agent:${requestId}] ========== ┘╛╪º█î╪º┘å ╪«┘ä╪º╪╡┘çΓÇî╪│╪º╪▓█î ==========`);

    return cleanedText || null;
  } catch (error: any) {
    console.error(`[Telegram:Agent:${requestId}] Γ¥î ERROR: ${error.message}`);
    console.error(`[Telegram:Agent:${requestId}] Stack: ${error.stack}`);
    return null;
  } finally {
    // ΓÜá∩╕Å ┘à┘ç┘à: ╪ó╪▓╪º╪» ┌⌐╪▒╪»┘å lock ╪»╪▒ ┘å┘ç╪º█î╪¬ (╪¡╪¬█î ╪»╪▒ ╪╡┘ê╪▒╪¬ ╪«╪╖╪º)
    agentLock.release();
  }
}
