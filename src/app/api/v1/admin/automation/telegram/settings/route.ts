import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/core/prisma";
import { testTelegramConnection, getChannelIdFromUpdates, getChatInfo } from "@/lib/automation/telegram/telegram-bot";

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

// GET: ?????? ??????? ??????
export async function GET() {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ?????? ??????? ??????
    let settings;
    try {
      settings = await prisma.unifiedRSSSettings.findFirst({
        orderBy: { created_at: 'desc' },
      });
    } catch (dbError: any) {
      console.error("? [Telegram Settings] ??? ?? ????? ?? ???????:", dbError.message);
      // ?? ???? ???? ???????? ??????? ??????? ???????
      return NextResponse.json({
        bot_token: "",
        channel_id: "",
        is_active: false,
        auto_send: false,
        category_ids: [],
        send_interval: 30,
        enable_watermark: false,
        watermark_logo_path: null,
        site_url: null,
        rss_date_filter: "today",
        last_sent_at: null,
      });
    }

    if (!settings) {
      return NextResponse.json({
        bot_token: "",
        channel_id: "",
        is_active: false,
        auto_send: false,
        category_ids: [],
        send_interval: 30,
        enable_watermark: false,
        watermark_logo_path: null,
        site_url: null,
        rss_date_filter: "today",
        last_sent_at: null,
      });
    }

    // Parse category_ids
    let categoryIds: number[] = [];
    if ((settings as any).category_ids) {
      try {
        categoryIds = JSON.parse((settings as any).category_ids);
      } catch (e) {
        console.error("Error parsing category_ids:", e);
      }
    }

    // Parse daily_prices_schedule
    let dailyPricesSchedule: number[] = [];
    if ((settings as any).daily_prices_schedule) {
      try {
        const schedule = typeof (settings as any).daily_prices_schedule === 'string'
          ? JSON.parse((settings as any).daily_prices_schedule)
          : (settings as any).daily_prices_schedule;
        if (Array.isArray(schedule)) {
          dailyPricesSchedule = schedule;
        }
      } catch (e) {
        console.error("Error parsing daily_prices_schedule:", e);
      }
    }

    // Parse category_rss_feeds - ???????? ?? ???? ????? (object) ? ???? (array)
    let categoryRssFeeds: Record<number, { url: string; name: string; is_active: boolean }[]> = {};
    if (settings.telegram_rss_feeds && settings.telegram_rss_feeds.trim() !== '') {
      try {
        const parsed = JSON.parse(settings.telegram_rss_feeds);
        if (parsed && typeof parsed === 'object') {
          // ????? ???? ????? ?? ????
          Object.keys(parsed).forEach((categoryId) => {
            const feed = parsed[parseInt(categoryId)];
            if (Array.isArray(feed)) {
              categoryRssFeeds[parseInt(categoryId)] = feed;
            } else if (feed && typeof feed === 'object') {
              // ???? ?????: ?? object - ????? ?? ?????
              categoryRssFeeds[parseInt(categoryId)] = [feed];
            }
          });
        }
      } catch (e) {
        console.error("Error parsing category_rss_feeds:", e);
        categoryRssFeeds = {};
      }
    }

    return NextResponse.json({
      id: settings.id,
      bot_token: settings.telegram_bot_token,
      channel_id: settings.telegram_channel_id,
      is_active: settings.is_active,
      auto_send: settings.telegram_auto_start,
      category_ids: categoryIds,
      category_rss_feeds: categoryRssFeeds,
      send_interval: settings.send_interval || 30,
      enable_watermark: settings.telegram_enable_watermark || false,
      watermark_logo_path: settings.watermark_logo_path || null,
      site_url: settings.site_url || null,
      rss_date_filter: settings.rss_date_filter || "today",
      last_sent_at: (settings as any).last_sent_at,
      daily_prices_auto_send: (settings as any).daily_prices_auto_send || false,
      daily_prices_schedule: dailyPricesSchedule,
    });
  } catch (error) {
    console.error("Error fetching Telegram settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: ????? ?? ??????????? ??????? ??????
export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      bot_token,
      channel_id,
      is_active,
      auto_send,
      category_ids,
      category_rss_feeds,
      send_interval,
      enable_watermark,
      watermark_logo_path,
      site_url,
      rss_date_filter,
      test_connection,
      get_channel_id,
      daily_prices_auto_send,
      daily_prices_schedule,
    } = body;

    // ??? ??????? ?????? Channel ID ???
    if (get_channel_id && bot_token) {
      const channelResult = await getChannelIdFromUpdates(bot_token);
      if (!channelResult.success) {
        return NextResponse.json(
          { error: channelResult.error || "??? ?? ?????? Channel ID" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        channels: channelResult.channels || [],
        channelId: channelResult.channelId,
      });
    }

    // ?????? ??????? ????? (??? ????????? ??? daily_prices ?? ?????? ????)
    let existing;
    try {
      existing = await prisma.unifiedRSSSettings.findFirst({
        orderBy: { created_at: 'desc' },
      });
    } catch (dbError: any) {
      console.error("? [Telegram Settings] ??? ?? ????? ?? ???????:", dbError.message);
      return NextResponse.json(
        { error: "??? ?? ????? ?? ???????. ????? ??????? ?? ?????????? ????." },
        { status: 500 }
      );
    }

    // ????? ????? ??? ??? daily_prices ??????? ?? ????????? ????? ????
    const isOnlyDailyPricesUpdate =
      daily_prices_auto_send !== undefined ||
      daily_prices_schedule !== undefined;

    // ??? ??? daily_prices ?? ????????? ?????? ????? ?? ??????? ????? ??????? ???????
    let finalBotToken = bot_token;
    let finalChannelId = channel_id;

    if (isOnlyDailyPricesUpdate && existing) {
      // ??????? ?? bot_token ? channel_id ????? ?? ???????
      if (!existing.telegram_bot_token || !existing.telegram_channel_id) {
        return NextResponse.json(
          { error: "????? bot_token ? channel_id ?? ?? ?? ??????? ???? ????" },
          { status: 400 }
        );
      }
      // ???????? bot_token ? channel_id ?? ??????? ?????
      finalBotToken = existing.telegram_bot_token;
      finalChannelId = existing.telegram_channel_id;
    } else {
      // ?????????? - ??? ????? ?? ????????? ??????? ???? ?? ????? ????
      if (!bot_token || !channel_id) {
        return NextResponse.json(
          { error: "bot_token ? channel_id ????? ?????" },
          { status: 400 }
        );
      }
    }

    // ??? ????? (??? ??????? ???)
    if (test_connection) {
      // ????? ????? ?? ?? Channel ID ???? ???
      const chatInfoResult = await getChatInfo(finalBotToken, finalChannelId);
      if (!chatInfoResult.success) {
        // ??? ???? "chat not found" ???? ???? ????? ???
        if (chatInfoResult.error?.includes('chat not found') || chatInfoResult.error?.includes('Chat not found')) {
          return NextResponse.json(
            {
              error: `????? ???? ???: ${channel_id}\n\n????? ????? ????:\n1. ???? ?? ????? ????? ??? ???? (?? ????? Admin)\n2. Channel ID ???? ????\n3. ??? ?? username ??????? ???????? ????? ???? ?? username ????? ??? ?? ????\n\n????: ${channel_id.includes('_bot') ? '?? ??? username ?? ???? ???? ?? ?????! ????? username ????? ?? ???? ????.' : ''}`
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: chatInfoResult.error || "??? ?? ????? ?????" },
          { status: 400 }
        );
      }

      // ????? ??? chat
      const chatType = chatInfoResult.chatInfo?.type;
      if (chatType !== 'channel' && chatType !== 'supergroup') {
        return NextResponse.json(
          {
            error: `??? ?? ${chatType} ???? ?? ?????. ????? Channel ID ?? ????? ?? ???? ????.`
          },
          { status: 400 }
        );
      }

      // ??? ?????
      const testResult = await testTelegramConnection(finalBotToken, finalChannelId);
      if (!testResult.success) {
        return NextResponse.json(
          { error: testResult.error || "??? ?? ????? ?? ??????" },
          { status: 400 }
        );
      }
    }

    // Parse category_ids
    // ??? ??? category_ids ?????? ?? body ????? ??? ????? ?? ?? ?????? ??
    let categoryIdsJson: string | null | undefined = undefined;
    if (category_ids !== undefined) {
      if (category_ids === null || (Array.isArray(category_ids) && category_ids.length === 0)) {
        categoryIdsJson = null;
      } else if (Array.isArray(category_ids)) {
        categoryIdsJson = JSON.stringify(category_ids);
      }
    }
    // ??? category_ids ?? body ???? (undefined)? categoryIdsJson ?? undefined ???????

    // Parse category_rss_feeds
    // ??? ??? category_rss_feeds ?????? ?? body ????? ??? ????? ?? ?? ?????? ??
    let categoryRssFeedsJson: string | null | undefined = undefined;
    if (category_rss_feeds !== undefined) {
      // ??? null ?? empty object ???? null ????? ??
      if (category_rss_feeds === null || (typeof category_rss_feeds === 'object' && Object.keys(category_rss_feeds).length === 0)) {
        categoryRssFeedsJson = null;
      } else if (typeof category_rss_feeds === 'object') {
        try {
          // ????? ????? object ???? ????
          if (Object.keys(category_rss_feeds).length > 0) {
            categoryRssFeedsJson = JSON.stringify(category_rss_feeds);
          } else {
            categoryRssFeedsJson = null;
          }
        } catch (e) {
          console.error("Error stringifying category_rss_feeds:", e);
          categoryRssFeedsJson = null;
        }
      }
    }
    // ??? category_rss_feeds ?? body ???? (undefined)? categoryRssFeedsJson ?? undefined ???????

    let settings;
    try {
      if (existing) {
        const updateData: any = {
          updated_at: new Date(),
        };

        // ??? ??? daily_prices ?? ?????? ????????? bot_token ? channel_id ?? ????? ??
        if (!isOnlyDailyPricesUpdate) {
          updateData.telegram_bot_token = finalBotToken;
          updateData.telegram_channel_id = finalChannelId;
        }

        // ??? ???????? ?? ????? ??????? ?? ?????? ??
        // ???: ??? ????? undefined ???? ???? ?? body ????? ???? ? ????? ?????? ???
        if (is_active !== undefined) updateData.is_active = is_active;
        if (auto_send !== undefined) updateData.telegram_auto_start = auto_send;
        if (categoryIdsJson !== undefined) updateData.category_ids = categoryIdsJson;
        // ??? ??? category_rss_feeds ?????? ?? body ????? ??? ???? (?? undefined)? ?? ?? ?????? ??
        if (categoryRssFeedsJson !== undefined) {
          updateData.telegram_rss_feeds = categoryRssFeedsJson;
        }
        if (send_interval !== undefined) updateData.send_interval = send_interval || 30;
        if (enable_watermark !== undefined) updateData.telegram_enable_watermark = enable_watermark;
        if (watermark_logo_path !== undefined) updateData.watermark_logo_path = watermark_logo_path || null;
        if (site_url !== undefined) updateData.site_url = site_url || null;
        if (rss_date_filter !== undefined) updateData.rss_date_filter = rss_date_filter || "today";

        // ????? ???? ??????? ???? ???? ??? (??? ????? ????? ?? schema)
        if (daily_prices_auto_send !== undefined) {
          updateData.daily_prices_auto_send = daily_prices_auto_send;
        }
        if (daily_prices_schedule !== undefined) {
          updateData.daily_prices_schedule = JSON.stringify(daily_prices_schedule);
        }

        settings = await prisma.unifiedRSSSettings.update({
          where: { id: existing.id },
          data: updateData,
        });
      } else {
        // ??? ???????? ???? ????? ? ??? daily_prices ?? ????????? ????? ????? ??? ???
        if (isOnlyDailyPricesUpdate) {
          return NextResponse.json(
            { error: "????? bot_token ? channel_id ?? ?? ?? ??????? ???? ????" },
            { status: 400 }
          );
        }

        const createData: any = {
          telegram_bot_token: bot_token,
          telegram_channel_id: channel_id,
          is_active: is_active ?? false,
          telegram_auto_start: auto_send ?? false,
          telegram_enabled: true,
          category_ids: categoryIdsJson,
          telegram_rss_feeds: categoryRssFeedsJson,
          send_interval: send_interval || 30,
          telegram_enable_watermark: enable_watermark ?? false,
          watermark_logo_path: watermark_logo_path || null,
          site_url: site_url || null,
          rss_date_filter: rss_date_filter || "today",
        };

        // ????? ???? ??????? ???? ???? ??? (??? ????? ????? ?? schema)
        if (daily_prices_auto_send !== undefined) {
          createData.daily_prices_auto_send = daily_prices_auto_send;
        }
        if (daily_prices_schedule !== undefined) {
          createData.daily_prices_schedule = JSON.stringify(daily_prices_schedule);
        }

        settings = await prisma.unifiedRSSSettings.create({
          data: createData,
        });
      }
    } catch (dbError: any) {
      console.error("? [Telegram Settings] ??? ?? ????? ???????:", dbError.message);
      return NextResponse.json(
        { error: "??? ?? ????? ???????. ????? ??????? ?? ????? ????." },
        { status: 500 }
      );
    }

    // Parse category_rss_feeds for response
    let categoryRssFeedsResponse: Record<number, { url: string; name: string; is_active: boolean }> = {};
    if (settings.telegram_rss_feeds) {
      try {
        categoryRssFeedsResponse = JSON.parse(settings.telegram_rss_feeds);
      } catch (e) {
        console.error("Error parsing category_rss_feeds for response:", e);
      }
    }

    // Parse daily_prices_schedule for response
    let dailyPricesScheduleResponse: number[] = [];
    if ((settings as any).daily_prices_schedule) {
      try {
        const schedule = typeof (settings as any).daily_prices_schedule === 'string'
          ? JSON.parse((settings as any).daily_prices_schedule)
          : (settings as any).daily_prices_schedule;
        if (Array.isArray(schedule)) {
          dailyPricesScheduleResponse = schedule;
        }
      } catch (e) {
        console.error("Error parsing daily_prices_schedule for response:", e);
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        bot_token: settings.telegram_bot_token,
        channel_id: settings.telegram_channel_id,
        is_active: settings.is_active,
        auto_send: settings.telegram_auto_start,
        category_ids: category_ids || [],
        category_rss_feeds: categoryRssFeedsResponse,
        send_interval: settings.send_interval,
        enable_watermark: settings.telegram_enable_watermark || false,
        watermark_logo_path: settings.watermark_logo_path || null,
        site_url: settings.site_url || null,
        rss_date_filter: settings.rss_date_filter || "today",
        last_sent_at: (settings as any).last_sent_at,
        daily_prices_auto_send: (settings as any).daily_prices_auto_send || false,
        daily_prices_schedule: dailyPricesScheduleResponse,
      },

      // وضعیت سیستم (Internal Schedulers Removed)
      autoRSSStatus: {
        started: false,
        message: 'Internal scheduler is deprecated. Use Unified RSS system.'
      },

      dailyPricesStatus: {
        started: false,
        message: 'Internal scheduler is deprecated.'
      }
    });
  } catch (error) {
    console.error("Error saving Telegram settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

