import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getAISettings } from "@/lib/ai/ai-settings";

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: number; role?: string };
}

/**
 * GET: ?????? ???? ??????? Backboard
 * Query params:
 * - provider: ????? ?? ???? provider (optional)
 * - model_type: ????? ?? ???? ??? ??? (llm ?? embedding) (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin" && role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ?????? ??????? AI
    const aiSettings = await getAISettings();
    if (!aiSettings) {
      return NextResponse.json(
        { error: "AI settings not found" },
        { status: 404 }
      );
    }

    // ?????? ??????? Backboard
    const backboardConfig = aiSettings.providers?.backboard;
    if (!backboardConfig?.apiKey) {
      return NextResponse.json(
        { error: "Backboard API key not configured" },
        { status: 400 }
      );
    }

    const endpoint = (backboardConfig as any)?.endpoint || "https://app.backboard.io/api";
    const apiKey = backboardConfig.apiKey;

    // ?????? query parameters
    const searchParams = req.nextUrl.searchParams;
    const provider = searchParams.get("provider");
    const modelType = searchParams.get("model_type") || "llm"; // ???????: llm
    const limit = parseInt(searchParams.get("limit") || "500"); // ?????? 500 ???

    // ??? provider filter ???? ???? ????? provider ????? ?? ?? ???????
    const providersToCheck = provider && provider.trim() !== "" && provider !== "[object Object]"
      ? [provider.trim()]
      : ["google", "aws-bedrock", "openai", "anthropic"]; // Provider ??? ????? ???? Gemini, Claude, GPT

    console.log(`[Backboard Models API] Checking providers: ${providersToCheck.join(", ")}`);

    // ???? helper ???? ?????? ?????? ?? ?? provider
    const fetchModelsFromProvider = async (providerName: string): Promise<any[]> => {
      const url = `${endpoint}/models?model_type=${modelType}&limit=${limit}&provider=${encodeURIComponent(providerName)}`;
      console.log(`[Backboard Models API] Fetching from provider "${providerName}": ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 ????? timeout
      
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "X-API-Key": apiKey,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Backboard Models API] Error from provider "${providerName}": ${response.status} - ${errorText.substring(0, 200)}`);
          return []; // ?? ???? ???? ????? ???? ????????????
        }

        const responseText = await response.text();
        const data = JSON.parse(responseText);
        console.log(`[Backboard Models API] Received ${data.models?.length || 0} models from provider "${providerName}"`);
        return data.models || [];
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error(`[Backboard Models API] Timeout for provider "${providerName}"`);
        } else {
          console.error(`[Backboard Models API] Fetch error for provider "${providerName}":`, fetchError.message);
        }
        return []; // ?? ???? ???? ????? ???? ????????????
      }
    };

    // ?????? ?????? ?? ??? provider ??? ???? ??? (?? ???? ?????)
    const allModelsPromises = providersToCheck.map(p => fetchModelsFromProvider(p));
    const allModelsArrays = await Promise.all(allModelsPromises);
    
    // ????? ??? ?????? ? ??? ????????? (?? ???? name)
    const modelsMap = new Map<string, any>();
    allModelsArrays.forEach(models => {
      models.forEach((model: any) => {
        if (model.name && !modelsMap.has(model.name)) {
          modelsMap.set(model.name, model);
        }
      });
    });
    
    const allModels = Array.from(modelsMap.values());
    console.log(`[Backboard Models API] Total unique models: ${allModels.length}`);
    const filteredModels = allModels.filter((model: any) => {
      const name = (model.name || '').toLowerCase();
      
      // 1. Gemini Flash models (?????? ???? ?????????? - ???? ? ?????)
      // gemini-2.5-flash, gemini-2.5-flash-lite, gemini-3-flash
      if (name.includes('gemini') && name.includes('flash')) {
        return true;
      }
      
      // 2. GPT-4o-mini, GPT-3.5-turbo (???? ? ?????)
      if (name.includes('gpt-4o-mini') || name.includes('gpt-3.5-turbo')) {
        return true;
      }
      
      // 3. Claude Haiku (???? ? ?????)
      if (name.includes('claude') && name.includes('haiku')) {
        return true;
      }
      
      return false;
    });

    console.log(`[Backboard Models API] Filtered ${filteredModels.length} models from ${allModels.length} total`);

    return NextResponse.json({
      success: true,
      models: filteredModels,
      total: filteredModels.length,
      totalAvailable: allModels.length,
    });
  } catch (error: any) {
    console.error("[Backboard Models API] ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Backboard models" },
      { status: 500 }
    );
  }
}

