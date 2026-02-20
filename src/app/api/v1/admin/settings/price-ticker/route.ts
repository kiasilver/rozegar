import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/core/prisma';
import { jwtVerify } from 'jose';

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export async function GET() {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.siteSetting.findMany({
      where: {
        group_name: 'price-ticker',
      },
    });

    const result: Record<string, any> = {};
    settings.forEach((setting) => {
      const key = setting.key?.replace('price_ticker_', '');
      if (key) {
        if (key === 'enabled' || key === 'show_stock_index' || key === 'show_dollar' || 
            key === 'show_gold' || key === 'show_gold_ounce' || key === 'show_gold_mithqal' ||
            key === 'show_coin' || key === 'show_euro' || 
            key === 'show_dirham' || key === 'show_bitcoin' || 
            key === 'show_tether' || key === 'show_brent_oil') {
          result[key] = setting.value === 'true';
        } else {
          result[key] = setting.value || '';
        }
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching price ticker settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

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

    const settingsToSave = [
      { key: 'price_ticker_enabled', value: body.enabled !== false },
      { key: 'price_ticker_show_stock_index', value: body.show_stock_index !== false },
      { key: 'price_ticker_show_dollar', value: body.show_dollar !== false },
      { key: 'price_ticker_show_gold', value: body.show_gold !== false },
      { key: 'price_ticker_show_gold_ounce', value: body.show_gold_ounce === true },
      { key: 'price_ticker_show_gold_mithqal', value: body.show_gold_mithqal === true },
      { key: 'price_ticker_show_coin', value: body.show_coin !== false },
      { key: 'price_ticker_show_euro', value: body.show_euro !== false },
      { key: 'price_ticker_show_dirham', value: body.show_dirham !== false },
      { key: 'price_ticker_show_bitcoin', value: body.show_bitcoin !== false },
      { key: 'price_ticker_show_tether', value: body.show_tether === true },
      { key: 'price_ticker_show_brent_oil', value: body.show_brent_oil === true },
      { key: 'price_ticker_api_url', value: body.api_url || '' },
      { key: 'price_ticker_refresh_interval', value: body.refresh_interval || '30' },
    ];

    await Promise.all(
      settingsToSave.map(({ key, value }) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { 
            value: String(value), 
            updated_at: new Date() 
          },
          create: { 
            key, 
            value: String(value), 
            group_name: 'price-ticker' 
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving price ticker settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

