/**
 * API برای kill کردن query های کند PostgreSQL
 * این endpoint باید به صورت منظم (مثلاً هر 5 دقیقه) فراخوانی شود
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function GET(req: Request) {
  try {
    // بررسی authorization
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kill کردن query های کند (بیش از 10 ثانیه)
    const result = await prisma.$queryRaw<Array<{ pid: number; terminated: boolean }>>`
      SELECT pid, pg_terminate_backend(pid) as terminated
      FROM pg_stat_activity
      WHERE state = 'active'
        AND pid != pg_backend_pid()
        AND query_start < NOW() - INTERVAL '10 seconds'
        AND application_name != 'psql'
    `;

    const killedCount = result.filter(r => r.terminated).length;

    return NextResponse.json({
      success: true,
      killed: killedCount,
      message: `Terminated ${killedCount} slow queries`,
    });
  } catch (error: any) {
    console.error('❌ [KILL-QUERIES] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

