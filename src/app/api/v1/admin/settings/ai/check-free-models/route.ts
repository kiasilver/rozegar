import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: number; role?: string };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

/**
 * بررسی اینکه آیا یک مدل HuggingFace رایگان است یا نه
 */
async function checkHuggingFaceModelFree(model: string): Promise<{
  isFree: boolean;
  requiresAuth: boolean;
  message: string;
}> {
  try {
    // تست بدون API key - اول از api-inference استفاده کن
    let response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: "test",
          parameters: {
            max_length: 10,
          },
        }),
      }
    );
    
    // اگر 410 داد (deprecated)، از router استفاده کن
    if (response.status === 410) {
      response = await fetch(
        `https://router.huggingface.co/models/${model}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: "test",
            parameters: {
              max_length: 10,
            },
          }),
        }
      );
    }

    if (response.ok) {
      return {
        isFree: true,
        requiresAuth: false,
        message: "✅ این مدل کاملاً رایگان است و نیازی به API key ندارد",
      };
    }

    if (response.status === 401 || response.status === 403) {
      // نیاز به API key دارد
      return {
        isFree: false,
        requiresAuth: true,
        message: "⚠️ این مدل نیاز به API key دارد",
      };
    }

    if (response.status === 503) {
      // مدل در حال لود شدن است
      return {
        isFree: true,
        requiresAuth: false,
        message: "✅ این مدل رایگان است (در حال لود شدن)",
      };
    }

    return {
      isFree: false,
      requiresAuth: true,
      message: `⚠️ خطا: ${response.status}`,
    };
  } catch (error) {
    return {
      isFree: false,
      requiresAuth: true,
      message: `❌ خطا در بررسی: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

/**
 * دریافت لیست مدل‌های محبوب رایگان از HuggingFace
 */
async function getPopularFreeModels(): Promise<Array<{
  model: string;
  name: string;
  description: string;
  language: string[];
  task: string;
}>> {
  try {
    // استفاده از HuggingFace API برای دریافت مدل‌های محبوب
    const response = await fetch(
      "https://huggingface.co/api/models?sort=downloads&direction=-1&filter=text-generation,summarization&limit=20",
      {
        headers: {
          "User-Agent": "Rozeghar-AI-System",
        },
      }
    );

    if (response.ok) {
      const models = await response.json();
      return models
        .filter((m: any) => 
          m.pipeline_tag === "text-generation" || 
          m.pipeline_tag === "summarization" ||
          m.tags?.includes("persian") ||
          m.tags?.includes("farsi")
        )
        .slice(0, 10)
        .map((m: any) => ({
          model: m.id,
          name: m.modelId || m.id,
          description: m.pipeline_tag || "Text Generation",
          language: m.tags?.filter((t: string) => t.startsWith("language:")) || [],
          task: m.pipeline_tag || "text-generation",
        }));
    }
  } catch (error) {
    console.error("Error fetching popular models:", error);
  }

  return [];
}

export async function GET(req: Request) {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const model = searchParams.get("model");

    if (action === "check" && model) {
      // بررسی یک مدل خاص
      const result = await checkHuggingFaceModelFree(model);
      return NextResponse.json(result);
    }

    if (action === "popular") {
      // دریافت لیست مدل‌های محبوب
      const models = await getPopularFreeModels();
      return NextResponse.json({ models });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in check-free-models:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

