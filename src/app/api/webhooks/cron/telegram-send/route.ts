/**
 * Telegram Auto Send Webhook (v1)
 */

import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = '/api/cron/telegram-auto-send';
  
  const body = await req.text();
  
  return fetch(url.toString(), {
    method: 'POST',
    headers: req.headers,
    body,
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = '/api/cron/telegram-auto-send';
  
  return fetch(url.toString(), {
    method: 'GET',
    headers: req.headers,
  });
}

