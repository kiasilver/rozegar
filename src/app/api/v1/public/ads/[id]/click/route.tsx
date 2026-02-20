import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adId = parseInt(id, 10);

    if (isNaN(adId)) {
      return NextResponse.json({ error: "Invalid ad ID" }, { status: 400 });
    }

    await prisma.ad.update({
      where: { id: adId },
      data: { click_count: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating ad click count:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}









