/**
 * News Processor for Telegram
 * Handles sending news to Telegram with image and watermark support
 */

import { sendTelegramPhoto, sendTelegramMessage, sendTelegramVideo, markdownToTelegramHTML } from './telegram-bot';
import { summarizeNewsForTelegram } from './telegram-agent';
import { downloadVideoForTelegram, cleanupVideoFile, isHLSUrl } from './video-downloader';
// We need to import extractMetadata. Since we are in lib/automation/telegram, we go up to lib/content/media
import { extractMetadata } from '../../content/media/html-media-extractor';

export class DuplicateNewsError extends Error {
  constructor(message: string = 'Duplicate news detected') {
    super(message);
    this.name = 'DuplicateNewsError';
  }
}

export interface SendNewsOptions {
  botToken: string;
  channelId: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string; // Add support for video
  sourceUrl?: string;
  enableWatermark?: boolean;
  watermarkPath?: string | null;
  categoryName?: string; // برای اضافه کردن هشتگ‌ها
}

export interface SendNewsResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface NewsProcessingOptions {
  siteUrl?: string;
  telegramSiteUrl?: string;
  categoryName?: string;
  rssImageUrl?: string;
  enableVideo?: boolean;
}

export interface ProcessedNews {
  message: string;
  imageUrl?: string;
  videoUrl?: string;
  hashtags?: string[];
}

/**
 * Process news for Telegram: Fetch content, summarize, prepare message
 */
export async function processNewsForTelegram(
  url: string,
  title: string,
  options: NewsProcessingOptions = {}
): Promise<ProcessedNews | null> {

  let fullContent = title;
  let extractedImage = options.rssImageUrl;

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RozegharBot/1.0)' } });
    if (response.ok) {
      const html = await response.text();

      // Extract metadata if image missing
      if (!extractedImage) {
        const metadata = await extractMetadata(url, html);
        extractedImage = metadata.image || undefined;
      }

      // Basic text extraction for summary
      // We strip typical script/style tags
      fullContent = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  } catch (e) {
    console.error("Error processing news content:", e);
  }

  const summary = await summarizeNewsForTelegram(
    fullContent,
    title,
    800, // Max length
    options.categoryName,
    url
  );

  if (!summary) return null;

  const message = `<b>${title}</b>\n\n${summary}`;

  return {
    message,
    imageUrl: extractedImage
  };
}

/**
 * Send news to Telegram with photo and watermark
 */
export async function sendNewsToTelegram(
  options: SendNewsOptions
): Promise<SendNewsResult> {
  try {
    const {
      botToken,
      channelId,
      content,
      imageUrl,
      videoUrl,
      sourceUrl,
      enableWatermark = false,
      watermarkPath,
      categoryName,
    } = options;

    // Convert Markdown to HTML first (AI sometimes uses ** instead of <b>)
    const cleanContent = markdownToTelegramHTML(content);
    console.log(`[News Processor] 📝 Content after markdown conversion (length: ${cleanContent.length})`);
    console.log(`[News Processor] 📝 Content preview (last 300 chars): ${cleanContent.substring(Math.max(0, cleanContent.length - 300))}`);

    // Create caption with source link
    let caption = cleanContent;

    // 🔴 اضافه کردن لینک "مشروح خبر" (قبل از هشتگ‌ها)
    if (sourceUrl) {
      // User requested hidden URL (clickable text) - "مشروح خبر" as link
      // We rely on truncateAndValidateCaption fixes to protect this tag
      caption += `\n\n📰 <a href="${sourceUrl}">مشروح خبر</a>`;
    }

    // 🔴 اضافه کردن هشتگ‌ها (بعد از لینک "مشروح خبر")
    if (categoryName) {
      const { getHashtagsForCategory } = await import('./category-hashtags');
      const hashtags = getHashtagsForCategory(categoryName).join(' ');
      if (hashtags) {
        caption += `\n\n${hashtags}`;
        console.log(`[News Processor] 🏷️ Added hashtags for category "${categoryName}": ${hashtags}`);
      }
    } else {
      // Check if hashtags are already present in content (for backward compatibility)
      const hashtagPattern = /#[\u0600-\u06FFa-zA-Z0-9_]+/g;
      const foundHashtags = caption.match(hashtagPattern);
      if (foundHashtags) {
        console.log(`[News Processor] 🏷️ Hashtags found in caption: ${foundHashtags.join(' ')}`);
      } else {
        console.warn(`[News Processor] ⚠️ No hashtags found in caption and no categoryName provided!`);
      }
    }

    // Priority is video
    if (videoUrl) {
      console.log(`[News Processor] 🎥 Video detected: ${videoUrl.substring(0, 80)}...`);
      console.log(`[News Processor]   Caption preview: ${caption.substring(caption.length - 200).replace(/\n/g, ' ')}`);

      // Download video first (HLS m3u8 → MP4, or direct download)
      let localVideoPath: string | undefined;
      try {
        if (isHLSUrl(videoUrl) || !videoUrl.match(/\.(mp4|webm)$/i)) {
          console.log(`[News Processor] 📥 Downloading video for Telegram...`);
          const downloadResult = await downloadVideoForTelegram(videoUrl);

          if (downloadResult.success && downloadResult.localPath) {
            localVideoPath = downloadResult.localPath;
            console.log(`[News Processor] ✅ Video downloaded: ${(downloadResult.fileSize! / 1024 / 1024).toFixed(2)} MB`);
          } else {
            console.warn(`[News Processor] ⚠️ Video download failed: ${downloadResult.error}`);
          }
        }
      } catch (downloadError: any) {
        console.warn(`[News Processor] ⚠️ Video download error: ${downloadError.message}`);
      }

      // Send video (local file if downloaded, otherwise try URL)
      const videoToSend = localVideoPath || videoUrl;
      console.log(`[News Processor] 🎥 Sending video to Telegram${localVideoPath ? ' (local file)' : ' (URL)'}...`);

      const result = await sendTelegramVideo(
        botToken,
        channelId,
        videoToSend,
        caption,
        {
          parse_mode: 'HTML',
        }
      );

      // Cleanup downloaded file
      if (localVideoPath) {
        await cleanupVideoFile(localVideoPath);
      }

      if (result.success) {
        return {
          success: true,
          messageId: result.message_id,
        };
      } else {
        console.warn(`[News Processor] ⚠️ Failed to send video, falling back to photo/text: ${result.error}`);
        // Fallback to photo/text if video fails
      }
    }

    // Send with photo or message (if no video)
    if (imageUrl) {
      console.log(`[News Processor] 📷 Sending photo to Telegram`);
      // Log caption preview
      console.log(`[News Processor]   Caption preview: ${caption.substring(caption.length - 200).replace(/\n/g, ' ')}`);

      const result = await sendTelegramPhoto(
        botToken,
        channelId,
        imageUrl,
        caption,
        {
          enableWatermark,
          logoPath: watermarkPath || undefined,
        }
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to send photo to Telegram',
        };
      }

      return {
        success: true,
        messageId: result.message_id,
      };
    } else {
      // Send text only
      const result = await sendTelegramMessage(botToken, channelId, caption);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to send message to Telegram',
        };
      }

      return {
        success: true,
        messageId: result.message_id,
      };
    }
  } catch (error: any) {
    console.error('[News Processor] Error sending to Telegram:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}
