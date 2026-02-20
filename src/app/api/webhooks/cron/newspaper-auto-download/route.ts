/**
 * Cron Job Endpoint for Auto Newspaper PDF Download
 * ??? endpoint ???? ?????? ?????? PDF ?????????? ??????? ??????
 * ???? ?? ??? ??? (????? ???? 7 ???) ???????? ???
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export async function GET(req: NextRequest) {
  return handleCronRequest(req);
}

export async function POST(req: NextRequest) {
  return handleCronRequest(req);
}

async function handleCronRequest(req: NextRequest) {
  try {
    // ????? API Key
    const authHeader = req.headers.get("authorization");
    const apiKey = process.env.CRON_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "CRON_API_KEY ????? ???? ???" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("?? ???? ?????? ?????? PDF ??????????...");

    // ?????? ???????
    const enabledSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_rss_enabled' },
    });

    const urlSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_rss_url' },
    });

    if (enabledSetting?.value !== 'true') {
      return NextResponse.json({
        success: false,
        message: '?????????? ??????? ?????',
      });
    }

    // ????? ????? ????? ??????
    const lastDownloadSetting = await prisma.siteSetting.findUnique({
      where: { key: 'newspaper_last_download_date' },
    });

    const today = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'persian',
    }).format(today);

    // ??? ????? ????? ?????? ???? ????? ?? ?????? ???? ????
    if (lastDownloadSetting?.value === persianDate) {
      console.log(`?? ??????????? ????? (${persianDate}) ????? ?????? ???????`);
      return NextResponse.json({
        success: true,
        message: `??????????? ????? (${persianDate}) ????? ?????? ???????`,
        result: {
          alreadyDownloaded: true,
          date: persianDate,
        },
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`?? ?????? ??????????? ????? ${persianDate}...`);

    const sourceUrl = urlSetting?.value || 'https://www.pishkhan.com/economics';

    // ?????? ???? ?????????? ? ?????? PDF???
    // ??????? ?? internal fetch ???? force ?????? PDF???
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.BASE_URL || 'http://localhost:3000';

    // ???????? endpoint ?? force download
    const response = await fetch(`${baseUrl}/api/v1/public/newspapers?forceDownload=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // force revalidation - no cache
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json({
        success: false,
        message: data.message || '??? ?? ?????? ??????????',
      });
    }

    // ????? ???????????? ?? PDF ?????
    const newspapersWithPDF = data.newspapers.filter((paper: any) => paper.pdfUrl);

    console.log(`✅ ${newspapersWithPDF.length} روزنامه با PDF دریافت شدند`);

    if (newspapersWithPDF.length > 0) {
      // ذخیره تاریخ فقط در صورت موفقیت
      await prisma.siteSetting.upsert({
        where: { key: 'newspaper_last_download_date' },
        update: {
          value: persianDate,
          updated_at: new Date(),
        },
        create: {
          key: 'newspaper_last_download_date',
          value: persianDate,
          group_name: 'newspaper',
        },
      });

      // ذخیره زمان آخرین دریافت
      await prisma.siteSetting.upsert({
        where: { key: 'newspaper_last_download_time' },
        update: {
          value: new Date().toISOString(),
          updated_at: new Date(),
        },
        create: {
          key: 'newspaper_last_download_time',
          value: new Date().toISOString(),
          group_name: 'newspaper',
        },
      });
    } else {
      console.log(`⚠️ هیچ PDF جدیدی برای امروز یافت نشد. تلاش مجدد در اجرای بعدی cron...`);
    }

    return NextResponse.json({
      success: true,
      message: "?????? ?????? PDF ?????????? ?? ?????? ????? ??",
      result: {
        totalNewspapers: data.count,
        newspapersWithPDF: newspapersWithPDF.length,
        date: persianDate,
        downloadedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("? ??? ?? cron job ?????? ???????:", error);

    return NextResponse.json(
      {
        error: error.message || "??? ?? ????? cron job",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

