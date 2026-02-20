import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { sendTelegramPhoto, sendTelegramMessage } from "@/lib/automation/telegram/telegram-bot";
import { processNewsForTelegram, DuplicateNewsError } from "@/lib/automation/telegram/news-processor";

/**
 * POST: ????? ?????? ????? ???? ?? ??????
 * ??? endpoint ?? cron job ???????? ??????
 */
export async function POST(req: NextRequest) {
  try {
    // ????? API Key ???? cron job
    const authHeader = req.headers.get("authorization");
    const apiKey = process.env.CRON_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ?????? ??????? ??????
    const settings = await prisma.unifiedRSSSettings.findFirst({
      orderBy: { created_at: 'desc' },
    });

    if (!settings || !settings.telegram_enabled || !settings.telegram_auto_start) {
      return NextResponse.json({
        success: true,
        message: "????? ?????? ??????? ???",
        sent: 0,
      });
    }

    // Parse rss_feeds for category_ids (??? ???? ?? ??????? RSS ?????? ???)
    let categoryIds: number[] = [];

    // ??? ????????? ?????? ????? ?? ??? ????????????? ???? ??????? ??
    if (categoryIds.length === 0) {
      const allCategories = await prisma.blogCategory.findMany({
        where: { is_active: true },
      });
      categoryIds = allCategories.map(cat => cat.id);
    }

    // ?????? ????? ???? ?? ???? ?? ?????? ????? ????????
    const lastSentAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 ???? ???

    // ?????? IDs ????????? ?? ????? ????? ???????
    const sentBlogs = await prisma.unifiedRSSLog.findMany({
      where: {
        telegram_sent: true,
        telegram_status: 'success',
        website_blog_id: { not: null },
      },
      select: {
        website_blog_id: true,
      },
    });
    const sentBlogIds = sentBlogs.map(log => log.website_blog_id).filter((id): id is number => id !== null);

    // ?????? ???????? ????
    const newBlogs = await prisma.blog.findMany({
      where: {
        status: 'PUBLISHED',
        is_active: true,
        published_at: {
          gte: lastSentAt,
        },
        ...(categoryIds.length > 0 ? {
          blogcategory: {
            some: {
              id: {
                in: categoryIds,
              },
            },
          },
        } : {}),
        // ??? ????????? ?? ???? ?? ?????? ????? ????????
        id: {
          notIn: sentBlogIds,
        },
      },
      include: {
        translations: {
          where: { lang: 'FA' },
        },
        blogcategory: true,
      },
      orderBy: {
        published_at: 'desc',
      },
      take: 10, // ?????? 10 ??? ?? ?? ???
    });

    if (newBlogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "??? ??? ????? ???? ????? ???? ???",
        sent: 0,
      });
    }

    console.log(`?? [Telegram Auto Send] ${newBlogs.length} ??? ???? ???? ????? ???? ??`);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    let sentCount = 0;
    let errorCount = 0;

    // ????? ?? ???
    for (const blog of newBlogs) {
      try {
        const translation = blog.translations[0];
        if (!translation) {
          console.warn(`?? [Telegram Auto Send] ????? ???? ???? ${blog.id} ???? ???`);
          continue;
        }

        // ????? ????? ????? ???? ?????
        if (!translation.title || translation.title.trim().length === 0) {
          console.warn(`?? [Telegram Auto Send] ????? ??? ???? ???? ????? ???????: Blog ID ${blog.id}`);
          errorCount++;
          continue;
        }

        // ????? ????? source_url ???? ????? ????
        if (!blog.source_url) {
          console.warn(`?? [Telegram Auto Send] source_url ??? ????? ????? ????? ???????: Blog ID ${blog.id}`);
          errorCount++;
          continue;
        }

        // ?????? ???? ??? ?? processNewsForTelegram (??? RSS auto send ? manual send)
        let processedNews;
        try {
          processedNews = await processNewsForTelegram(
            blog.source_url,
            translation.title,
            {
              siteUrl: siteUrl,
              telegramSiteUrl: settings.site_url || undefined,
              categoryName: undefined,
              rssImageUrl: undefined, // ?? blog.image ??????? ??????
            }
          );
        } catch (error: any) {
          if (error instanceof DuplicateNewsError) {
            console.log(`?? [Telegram Auto Send] ??? ?????? ??? - skip ??????: ${translation.title.substring(0, 50)}...`);
            continue; // Skip duplicate without counting as error
          }
          // ???? ???? ?????? processedNews ?? null ???????
          processedNews = null;
        }

        if (!processedNews) {
          console.warn(`?? [Telegram Auto Send] ?????? ??? ???? ???? - ??? ????? ???????: ${translation.title.substring(0, 50)}...`);
          errorCount++;
          continue;
        }

        const { message, imageUrl } = processedNews;

        // ????? ?? ??????
        let result;
        if (imageUrl && imageUrl.trim() !== '') {
          // ????? ????? ??? ????????? ????? ??? (147 ?? 148) - ?? ??? ???? watermark ??????? ???
          const categoryId = blog.blogcategory?.[0]?.id;
          const isCarCategory = categoryId === 147 || categoryId === 148;
          const shouldEnableWatermark = isCarCategory ? false : (settings.telegram_enable_watermark || false);

          if (isCarCategory) {
            console.log(`[Telegram Auto Send] ?? Car category detected (${categoryId}) - watermark disabled`);
          }

          result = await sendTelegramPhoto(
            settings.telegram_bot_token!,
            settings.telegram_channel_id!,
            imageUrl,
            message,
            {
              enableWatermark: shouldEnableWatermark,
              logoPath: settings.watermark_logo_path || undefined,
            }
          );

          if (!result.success && result.error) {
            console.warn(`?? [Telegram Auto Send] ????? ??? ???? ????: ${result.error}`);
            result = await sendTelegramMessage(
              settings.telegram_bot_token!,
              settings.telegram_channel_id!,
              message
            );
          }
        } else {
          result = await sendTelegramMessage(
            settings.telegram_bot_token!,
            settings.telegram_channel_id!,
            message
          );
        }

        // ????? ???
        await prisma.unifiedRSSLog.create({
          data: {
            title: translation.title,
            original_url: blog.source_url,
            website_blog_id: blog.id,
            target: 'telegram',
            telegram_sent: result.success,
            telegram_message_id: result.message_id || null,
            telegram_status: result.success ? 'success' : 'error',
            telegram_error: result.error || null,
            telegram_content: message,
            processed_at: new Date(),
          },
        });

        if (result.success) {
          sentCount++;
          console.log(`? [Telegram Auto Send] ??? ${blog.id} ?? ?????? ????? ??`);
        } else {
          errorCount++;
          console.error(`? [Telegram Auto Send] ??? ?? ????? ??? ${blog.id}: ${result.error}`);
        }

        // ????? ????? ??? ???????? (???? ??????? ?? rate limit)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        errorCount++;
        console.error(`? [Telegram Auto Send] ??? ?? ?????? ??? ${blog.id}:`, error);

        // ????? ??? ???
        const blogTranslation = blog.translations?.[0];
        await prisma.unifiedRSSLog.create({
          data: {
            title: blogTranslation?.title || `Blog ${blog.id}`,
            original_url: blog.source_url || null,
            website_blog_id: blog.id,
            target: 'telegram',
            telegram_sent: false,
            telegram_status: 'error',
            telegram_error: error.message || '???? ????????',
            processed_at: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${sentCount} ??? ?? ?????? ????? ??`,
      sent: sentCount,
      errors: errorCount,
      total: newBlogs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("? [Telegram Auto Send] ???:", error);
    return NextResponse.json(
      {
        error: error.message || "??? ?? ????? ??????",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

