import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, website, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "???? ????? ? ???? ?????? ?????" },
        { status: 400 }
      );
    }

    // Here you can save to database, send email, etc.
    // For now, we'll just log it
    console.log("Contact form submission:", {
      name,
      email,
      phone,
      website,
      message,
      timestamp: new Date().toISOString(),
    });

    // TODO: Save to database or send email notification
    // You can create a ContactMessage model in Prisma if needed

    return NextResponse.json({
      success: true,
      message: "???? ??? ?? ?????? ?????? ??",
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    return NextResponse.json(
      { error: "??? ?? ?????? ???????" },
      { status: 500 }
    );
  }
}

