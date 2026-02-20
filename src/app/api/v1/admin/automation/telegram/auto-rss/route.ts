/**
 * API کنترل سرویس دهنده خودکار (Deprecated)
 * این سرویس با Unified RSS جایگزین شده است.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    status: {
      isRunning: false,
      isChecking: false,
      lastCheck: null,
      nextCheck: null
    },
    message: "Internal scheduler is deprecated. Use Unified RSS."
  });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: false,
    message: "Internal scheduler is removed. Please use Unified RSS system."
  });
}

