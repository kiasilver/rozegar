import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { z } from "zod";

import {
  getAISettings,
  saveAISettings,
} from "@/lib/ai/ai-settings";
import type { AIProvider, AISettings } from "@/types/ai";

const providerSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().min(2),
  enabled: z.boolean().optional().default(true),
  label: z.string().optional(),
  isLimitedFree: z.boolean().optional(),
  notes: z.string().optional(),
  repository: z.string().optional(), // ???? Cursor
  endpoint: z.string().optional(), // ???? Custom AI ? Backboard
  assistantId: z.string().optional(), // ???? Backboard
});

const aiSettingsSchema = z.object({
  defaultProvider: z.enum(["huggingface", "cursor", "custom", "openai", "backboard", "gemini"]),
  fallbackProvider: z.enum(["huggingface", "cursor", "custom", "openai", "backboard", "gemini"]).nullable().optional(),
  enableFallback: z.boolean().optional().default(true),
  providers: z.object({
    huggingface: providerSchema,
    cursor: providerSchema,
    custom: providerSchema,
    openai: providerSchema,
    backboard: providerSchema,
    gemini: providerSchema,
  }),
  imageApis: z.object({
    unsplash: z.string().optional(),
    pexels: z.string().optional(),
  }).optional(),
});

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
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

    const settings = await getAISettings();
    return NextResponse.json({
      settings,
      // Suggestions removed - using model list APIs instead
    });
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return NextResponse.json(
      { error: "Failed to load AI settings" },
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
    const parsed = aiSettingsSchema.parse(body) as AISettings;

    // ?????? ?????: ??? ??? ??????? ???/??? API Key ?? ?? ??? ?????????
    (Object.keys(parsed.providers) as AIProvider[]).forEach((provider) => {
      const config = parsed.providers[provider];
      config.apiKey = config.apiKey?.trim() || "";
    });

    const saved = await saveAISettings(parsed);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error saving AI settings:", error);
    return NextResponse.json(
      { error: "Failed to save AI settings" },
      { status: 500 }
    );
  }
}

