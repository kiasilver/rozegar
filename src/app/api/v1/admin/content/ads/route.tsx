import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { z } from "zod";

// Validation برای URL یا مسیر نسبی
const urlOrPathSchema = z.string().transform((val) => {
  // Normalize: remove trailing slash if it's not a directory
  if (val && val.endsWith('/') && !val.endsWith('//')) {
    return val.slice(0, -1);
  }
  return val;
}).refine(
  (val) => {
    if (!val || val.trim() === '') return true; // Empty is valid (optional)
    // Check if it's a valid URL
    try {
      new URL(val);
      return true;
    } catch {
      // If not a URL, check if it's a valid path
      return /^[\w\/\-\.]+$/.test(val);
    }
  },
  { message: "آدرس تصویر باید یک URL معتبر یا مسیر نسبی باشد" }
).optional();

// Validation برای datetime-local format (YYYY-MM-DDTHH:mm) تبدیل به ISO 8601
const datetimeLocalSchema = z.preprocess(
  (val) => {
    // Handle empty strings and undefined
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      return undefined;
    }
    return val;
  },
  z
    .union([z.string(), z.undefined()])
    .transform((val) => {
      if (!val) return undefined;
      // datetime-local format: YYYY-MM-DDTHH:mm
      // Convert to ISO 8601: YYYY-MM-DDTHH:mm:ss (add seconds)
      const datetimeLocalPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/;
      if (datetimeLocalPattern.test(val)) {
        // Add seconds and convert to ISO format
        return `${val}:00`;
      }
      // If already in ISO format (with seconds), return as is
      return val;
    })
    .refine(
      (val) => {
        if (!val) return true; // Empty is valid (optional)
        // Validate that it's a valid date
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: "فرمت تاریخ نامعتبر است" }
    )
    .optional()
);

const adSchema = z.object({
  title: z.string().optional(),
  position: z.enum([
    "HEADER_TOP",
    "HEADER_MIDDLE",
    "BANNER_TOP_HEADER_LEFT",
    "BANNER_TOP_HEADER_RIGHT",
    "SIDEBAR_TOP",
    "SIDEBAR_MIDDLE",
    "SIDEBAR_BOTTOM",
    "CONTENT_TOP",
    "CONTENT_MIDDLE",
    "CONTENT_BOTTOM",
    "BANNER_BOTTOM",
    "IN_ARTICLE",
    "POPUP",
    "STICKY",
    "STICKY_BOTTOM_RIGHT",
  ]),
  type: z.enum(["IMAGE", "GIF", "HTML", "SCRIPT"]).default("IMAGE"),
  image_url: urlOrPathSchema,
  html_content: z.string().optional(),
  script_code: z.string().optional(),
  link_url: z.string().url().optional().or(z.literal("")),
  target: z.enum(["_blank", "_self"]).default("_blank"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  is_active: z.boolean().default(true),
  start_date: datetimeLocalSchema,
  end_date: datetimeLocalSchema,
  priority: z.number().int().default(0),
});

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

// GET - لیست تبلیغات
export async function GET(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await verifyJWT(token);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const position = searchParams.get("position");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") || "newest";

    // Build where clause
    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
      ];
    }

    if (position) {
      whereClause.position = position;
    }

    if (type) {
      whereClause.type = type;
    }

    if (status === "active") {
      whereClause.is_active = true;
    } else if (status === "inactive") {
      whereClause.is_active = false;
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sort) {
      case "oldest":
        orderBy = { created_at: "asc" };
        break;
      case "views":
        orderBy = { view_count: "desc" };
        break;
      case "clicks":
        orderBy = { click_count: "desc" };
        break;
      case "priority":
        orderBy = { priority: "desc" };
        break;
      default:
        orderBy = [{ priority: "desc" }, { created_at: "desc" }];
    }

    const ads = await prisma.ad.findMany({
      where: whereClause,
      orderBy,
    });

    return NextResponse.json(ads);
  } catch (error) {
    console.error("Error fetching ads:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST - ایجاد تبلیغ جدید
export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = adSchema.parse(body);

    const ad = await prisma.ad.create({
      data: {
        ...validatedData,
        start_date: validatedData.start_date
          ? new Date(validatedData.start_date)
          : null,
        end_date: validatedData.end_date
          ? new Date(validatedData.end_date)
          : null,
      },
    });

    return NextResponse.json(ad, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating ad:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

