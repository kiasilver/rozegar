/**
 * Telegram Logs API (v1)
 */

import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = '/api/v1/admin/automation/telegram/logs';
  url.search = new URL(req.url).search;
  
  return fetch(url.toString(), {
    method: 'GET',
    headers: req.headers,
  });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = '/api/v1/admin/automation/telegram/logs/delete-all';
  
  return fetch(url.toString(), {
    method: 'DELETE',
    headers: req.headers,
  });
}

