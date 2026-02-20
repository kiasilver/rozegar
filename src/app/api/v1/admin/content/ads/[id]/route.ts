/**
 * Single Ad API (v1)
 */

import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = new URL(req.url);
  url.pathname = `/api/admin/ads/${params.id}`;

  return fetch(url.toString(), {
    method: 'GET',
    headers: req.headers,
  });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = new URL(req.url);
  url.pathname = `/api/admin/ads/${params.id}`;

  const body = await req.text();

  return fetch(url.toString(), {
    method: 'PUT',
    headers: req.headers,
    body,
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = new URL(req.url);
  url.pathname = `/api/admin/ads/${params.id}`;

  return fetch(url.toString(), {
    method: 'DELETE',
    headers: req.headers,
  });
}

