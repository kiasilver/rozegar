/**
 * Short Link Redirect Route
 * Handles short URLs like /n/aBc123
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBlogFromCode } from '@/lib/content/blog/blog-short-link';
import { notFound, redirect } from 'next/navigation';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ code: string }> }
) {
  const params = await props.params;

  try {
    const blog = await getBlogFromCode(params.code);

    if (!blog) {
      return notFound();
    }

    // Get the slug from the first translation (usually FA)
    const slug = blog.translations?.[0]?.slug;

    if (!slug) {
      return notFound();
    }

    // Redirect to the blog page
    return redirect(`/blog/${slug}`);
  } catch (error) {
    console.error('Error in short link redirect:', error);
    return notFound();
  }
}
