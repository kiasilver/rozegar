import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const idParam = params.id;

  // IMPORTANT: Check for known static routes FIRST before processing as ID
  // Next.js should match static routes before dynamic routes, but this is a safety check
  const knownStaticRoutes = ['bloglist', 'blogList', 'recent', 'category', 'upload', 'generate-seo', 'generation-progress', 'update-slugs', 'update-category-slugs', 'bulkdelete'];
  
  // If this matches a known static route, return 404 to let Next.js try the static route
  if (knownStaticRoutes.includes(idParam) || knownStaticRoutes.includes(idParam.toLowerCase())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Only accept numeric IDs
  if (!/^\d+$/.test(idParam)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const id = parseInt(idParam);

  try {
    const blog = await prisma.blog.findUnique({
      where: { id },
      include: {
        translations: true,
        blogcategory: { include: { translations: true } },
        User: true
      }
    });

    if (!blog) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(blog);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ success: false, error: 'Not implemented yet' }, { status: 501 });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const idParam = params.id;

  // Check for known static routes
  const knownStaticRoutes = ['bloglist', 'blogList', 'recent', 'category', 'upload', 'generate-seo', 'generation-progress', 'update-slugs', 'update-category-slugs', 'bulkdelete'];
  if (knownStaticRoutes.includes(idParam) || knownStaticRoutes.includes(idParam.toLowerCase())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Only accept numeric IDs
  if (!/^\d+$/.test(idParam)) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const id = parseInt(idParam);

  try {
    await prisma.blog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}



