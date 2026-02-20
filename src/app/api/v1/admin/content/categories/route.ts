/**
 * Categories API (v1)
 * این route به API قدیمی redirect می‌کند
 */

import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = '/api/v1/admin/content/blogs/category';
  
  return fetch(url.toString(), {
    method: 'GET',
    headers: req.headers,
  });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  url.pathname = '/api/v1/admin/content/blogs/category';
  
  const body = await req.text();
  
  return fetch(url.toString(), {
    method: 'POST',
    headers: req.headers,
    body,
  });
}

