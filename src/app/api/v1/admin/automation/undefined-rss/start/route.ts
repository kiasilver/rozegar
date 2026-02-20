/**
 * Unified RSS Start/Stop API (v1)
 */

import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const target = body.target || 'telegram'; // telegram or website

  const url = new URL(req.url);
  url.pathname = `/api/v1/admin/automation/undefined-rss/${target}/start`;

  return fetch(url.toString(), {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(body),
  });
}

