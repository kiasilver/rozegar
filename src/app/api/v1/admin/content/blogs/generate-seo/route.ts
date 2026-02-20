import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { generateSEO } from "@/lib/content/seo/seo-ai";

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await verifyJWT(token);

    const body = await req.json();
    const { 
      title, 
      content, 
      keywords = [], 
      useAI = true, 
      aiProvider = "cursor",
      useAgentAnalysis = false, // ??????? ?? AI Agent ???? ????? ????
      language = "fa"
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // ?????? ??????? AI ?? ???????
    const { getAISettings, getProviderConfig } = await import("@/lib/ai/ai-settings");
    const aiSettings = await getAISettings();
    
    // ??? useAgentAnalysis ???? ???? ?????? ?? Cursor ?? OpenAI
    let finalProvider = aiProvider;
    if (useAgentAnalysis) {
      // ????? ????? Cursor ?? OpenAI ???? ???
      const cursorConfig = getProviderConfig(aiSettings, "cursor");
      const openaiConfig = getProviderConfig(aiSettings, "openai");
      
      if (cursorConfig?.enabled && cursorConfig?.apiKey) {
        finalProvider = "cursor";
      } else if (openaiConfig?.enabled && openaiConfig?.apiKey) {
        finalProvider = "openai";
      } else {
        return NextResponse.json(
          { error: "???? ??????? ?? AI Agent? ????? Cursor ?? OpenAI ?? ?? ??????? AI ???? ???? ? API key ???? ????." },
          { status: 400 }
        );
      }
    }
    
    const providerConfig = getProviderConfig(aiSettings, finalProvider);
    
    if (!providerConfig.apiKey && (finalProvider === "openai" || finalProvider === "cursor")) {
      return NextResponse.json(
        { error: `${finalProvider === "cursor" ? "Cursor" : "OpenAI"} API key not configured. Please set it in /admin/setting/ai` },
        { status: 400 }
      );
    }
    
    const result = await generateSEO(title, content, keywords, {
      useAI,
      aiProvider: finalProvider,
      language,
      apiKey: providerConfig.apiKey,
      model: providerConfig.model,
      useAgentAnalysis, // ??? ???? useAgentAnalysis ?? generateSEO
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating SEO:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

