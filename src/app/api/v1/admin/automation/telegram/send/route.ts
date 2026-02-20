/**
 * Telegram Send API (v1)
 */

import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = '/api/v1/admin/automation/telegram/send';
  
  const body = await req.text();
  
  return fetch(url.toString(), {
    method: 'POST',
    headers: req.headers,
    body,
  });
}

