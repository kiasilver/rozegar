import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getAISettings, getProviderConfig } from "@/lib/ai/ai-settings";
import type { AIProvider } from "@/types/ai";

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

    const { role } = await verifyJWT(token);
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { provider, apiKey, model, endpoint } = body;

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    // ???? Cursor? Custom? OpenAI? Backboard ? Gemini? API key ?????? ???
    // ???? HuggingFace? API key ??????? ???
    if ((provider === "cursor" || provider === "custom" || provider === "openai" || provider === "backboard" || provider === "gemini") && !apiKey) {
      return NextResponse.json(
        { error: "API key is required for this provider" },
        { status: 400 }
      );
    }

    // ???? Custom ? Backboard? endpoint ?????? ???
    if ((provider === "custom" || provider === "backboard") && !endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required for this provider" },
        { status: 400 }
      );
    }

    // ???? HuggingFace? ??? model ???? ????? ?? ??? ??????? ??????? ???????
    // ??????? ?? facebook/bart-large-cnn ?? ?? Inference API ???????? ??????
    const testModel = model?.trim() || (provider === "huggingface" ? "facebook/bart-large-cnn" : "auto");

    let result: {
      success: boolean;
      message: string;
      details?: any;
    };

    if (provider === "huggingface") {
      // ??? HuggingFace API
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        // ??? ??? API key ?????? Authorization header ????? ??
        if (apiKey && apiKey.trim() !== "") {
          headers.Authorization = `Bearer ${apiKey}`;
        }

        // ??????? ?? OpenAI-compatible API (endpoint ????)
        const testText = "What is the capital of France?";
        
        // ??????? ?? OpenAI-compatible format
        const response = await fetch(
          "https://router.huggingface.co/v1/chat/completions",
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: testModel || "zai-org/GLM-4.7:novita", // ??? ??????? ??? ???? ????
              messages: [
                {
                  role: "user",
                  content: testText,
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const messageContent = data.choices?.[0]?.message?.content || "???? ?????? ??";
          result = {
            success: true,
            message: "? HuggingFace API ? ??? ?? ????? ??? ???????!",
            details: {
              model: testModel,
              note: apiKey ? "?? API key" : "???? API key (??????)",
              response: messageContent.substring(0, 100),
            },
          };
        } else if (response.status === 503) {
          result = {
            success: false,
            message: "?? ??? ?? ??? ??? ??? ??? - ????? ??? ???? ??? ???? ? ?????? ??? ????",
            details: {
              model: testModel,
              status: 503,
              hint: "??? ????? ??? - ??? ???? ????? ??? ???? ??? ???. 10-30 ????? ??? ???? ? ?????? ??? ????.",
            },
          };
        } else if (response.status === 404) {
          const errorText = await response.text().catch(() => "Unknown error");
          result = {
            success: false,
            message: `? ??? "${testModel}" ???? ??? (404)`,
            details: {
              model: testModel,
              status: 404,
              error: errorText.substring(0, 300),
              possibleReasons: [
                "??? ??? ?????? ???",
                "??? ?? Inference API ?? ????? ????",
                "??? private ??? ? ???? ?? API key ????",
              ],
              suggestions: [
                "??? ??? ?? ?? ??????? AI ????? ????",
                "????? ???? ?? ??? ?? HuggingFace ???? ????: https://huggingface.co/" + testModel,
                "???? ??????? private? API key ?? ???? ????",
                "?? ??????? public ????? ??????? ???? (?????: m3hrdadfi/bert2bert-fa-wiki-summary)",
              ],
              alternativeModels: {
                persian: "m3hrdadfi/bert2bert-fa-wiki-summary",
                english: "facebook/bart-large-cnn",
              },
            },
          };
        } else if (response.status === 401 || response.status === 403) {
          result = {
            success: false,
            message: "?? ??? ??? ???? ?? API key ????",
            details: {
              model: testModel,
              status: response.status,
              hint: "????? API key ?? ?? ??????? ???? ???? ?? API key ?? ????? ????.",
              helpUrl: "https://huggingface.co/settings/tokens",
            },
          };
        } else {
          const errorText = await response.text().catch(() => "Unknown error");
          result = {
            success: false,
            message: `? ??? ?? HuggingFace API (${response.status})`,
            details: {
              model: testModel,
              status: response.status,
              error: errorText.substring(0, 300),
              hint: "????? ??? ???? API key ? ??????? ?? ????? ????.",
            },
          };
        }
      } catch (error: any) {
        result = {
          success: false,
          message: `? ??? ?? ????? ?? HuggingFace API: ${error instanceof Error ? error.message : "???? ????????"}`,
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } else if (provider === "cursor") {
      // ??? Cursor API
      try {
        // ??? ?? /v0/me endpoint ???? ????? ?????? API key
        const response = await fetch("https://api.cursor.com/v0/me", {
          method: "GET",
          headers: {
            Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // ?????? ??? ?????? ??????
          const modelsResponse = await fetch("https://api.cursor.com/v0/models", {
            method: "GET",
            headers: {
              Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
            },
          });

          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            result = {
              success: true,
              message: "? Cursor API key ????? ??? ? ?????? ?? ????? ?????!",
              details: {
                apiKeyName: data.apiKeyName,
                userEmail: data.userEmail,
                availableModels: modelsData.models || [],
                note: "????? ?? ??? 'auto' ??????? ?????? - Cursor ?????? ??? ?? ?????? ??????",
              },
            };
          } else {
            result = {
              success: true,
              message: "? Cursor API key ????? ???!",
              details: {
                apiKeyName: data.apiKeyName,
                userEmail: data.userEmail,
              },
            };
          }
        } else if (response.status === 401 || response.status === 403) {
          result = {
            success: false,
            message: "? API key ??????? ???",
            details: "????? API key ?? ?? Cursor Dashboard ? Integrations ?????? ????",
          };
        } else {
          const errorText = await response.text();
          result = {
            success: false,
            message: `? ??? ?? Cursor API (${response.status})`,
            details: errorText.substring(0, 200),
          };
        }
      } catch (error) {
        result = {
          success: false,
          message: `? ??? ?? ????? ?? Cursor API: ${error instanceof Error ? error.message : "???? ????????"}`,
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } else if (provider === "openai") {
      // ??? OpenAI API
      try {
        const testText = "What is the capital of France?";
        const testModel = model?.trim() || "gpt-3.5-turbo";
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: testModel,
            messages: [
              {
                role: "user",
                content: testText,
              },
            ],
            max_tokens: 50,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const messageContent = data.choices?.[0]?.message?.content || "???? ?????? ??";
          result = {
            success: true,
            message: `? OpenAI API ? ??? ${testModel} ?? ????? ??? ???????!`,
            details: {
              model: testModel,
              response: messageContent.substring(0, 100),
              usage: data.usage,
              note: testModel === "gpt-3.5-turbo" ? "??? ???????? - ????? ???? ???" : "??? ??????????",
            },
          };
        } else if (response.status === 401) {
          result = {
            success: false,
            message: "? API key ??????? ???",
            details: {
              hint: "????? API key ?? ?? https://platform.openai.com/api-keys ?????? ????",
              helpUrl: "https://platform.openai.com/api-keys",
            },
          };
        } else if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          result = {
            success: false,
            message: "?? Quota ???? ??? ?? Rate limit exceeded",
            details: {
              hint: "????? billing ?? ?? https://platform.openai.com/account/billing ???? ????",
              helpUrl: "https://platform.openai.com/account/billing",
              error: errorData.error?.message || "Rate limit exceeded",
            },
          };
        } else {
          const errorText = await response.text().catch(() => "Unknown error");
          result = {
            success: false,
            message: `? ??? ?? OpenAI API (${response.status})`,
            details: {
              model: testModel,
              status: response.status,
              error: errorText.substring(0, 300),
              hint: "????? API key? ??? ? billing ?? ????? ????.",
            },
          };
        }
      } catch (error: any) {
        result = {
          success: false,
          message: `? ??? ?? ????? ?? OpenAI API: ${error instanceof Error ? error.message : "???? ????????"}`,
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } else if (provider === "backboard") {
      // ??? Backboard.io API (Assistant-based)
      try {
        const baseEndpoint = endpoint || "https://app.backboard.io/api";
        const testModel = model?.trim() || "gpt-3.5-turbo";
        const testText = "What is the capital of France?";
        
        // ????? 1: ????? Assistant
        const assistantResponse = await fetch(`${baseEndpoint}/assistants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            name: "Test Assistant",
            description: "Assistant for testing",
          }),
        });

        if (!assistantResponse.ok) {
          const errorText = await assistantResponse.text().catch(() => "Unknown error");
          result = {
            success: false,
            message: `? ??? ?? ????? Assistant (${assistantResponse.status})`,
            details: {
              endpoint: baseEndpoint,
              status: assistantResponse.status,
              error: errorText.substring(0, 300),
              hint: "????? API key ?? ????? ????. ???????: https://app.backboard.io/docs",
              helpUrl: "https://app.backboard.io/docs",
            },
          };
        } else {
          const assistantData = await assistantResponse.json();
          const assistantId = assistantData.assistant_id;

          // ????? 2: ????? Thread
          const threadResponse = await fetch(`${baseEndpoint}/assistants/${assistantId}/threads`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": apiKey,
            },
            body: JSON.stringify({}),
          });

          if (!threadResponse.ok) {
            const errorText = await threadResponse.text().catch(() => "Unknown error");
            result = {
              success: false,
              message: `? ??? ?? ????? Thread (${threadResponse.status})`,
              details: {
                endpoint: baseEndpoint,
                assistantId,
                status: threadResponse.status,
                error: errorText.substring(0, 300),
              },
            };
          } else {
            const threadData = await threadResponse.json();
            const threadId = threadData.thread_id;

            // ????? 3: ????? Message
            const formData = new FormData();
            formData.append('content', testText);
            formData.append('model_name', testModel);
            formData.append('llm_provider', 'openai');
            formData.append('stream', 'false');
            formData.append('memory', 'off');
            formData.append('send_to_llm', 'true');

            const messageResponse = await fetch(`${baseEndpoint}/threads/${threadId}/messages`, {
              method: "POST",
              headers: {
                "X-API-Key": apiKey,
              },
              body: formData,
            });

            if (messageResponse.ok) {
              const data = await messageResponse.json();
              const messageContent = data.content || "???? ?????? ??";
              result = {
                success: true,
                message: `? Backboard.io API ? ??? ${testModel} ?? ????? ??? ???????!`,
                details: {
                  endpoint: baseEndpoint,
                  model: testModel,
                  response: messageContent.substring(0, 100),
                  inputTokens: data.input_tokens,
                  outputTokens: data.output_tokens,
                  totalTokens: data.total_tokens,
                  note: "Backboard.io ?????? ?? 2200+ ??? LLM ?? ????? ??????",
                },
              };
            } else {
              const errorText = await messageResponse.text().catch(() => "Unknown error");
              result = {
                success: false,
                message: `? ??? ?? ????? Message (${messageResponse.status})`,
                details: {
                  endpoint: baseEndpoint,
                  model: testModel,
                  status: messageResponse.status,
                  error: errorText.substring(0, 300),
                  hint: "????? endpoint? API key ? ??? ?? ????? ????. ???????: https://app.backboard.io/docs",
                  helpUrl: "https://app.backboard.io/docs",
                },
              };
            }
          }
        }
      } catch (error: any) {
        result = {
          success: false,
          message: `? ??? ?? ????? ?? Backboard.io API: ${error instanceof Error ? error.message : "???? ????????"}`,
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } else if (provider === "custom") {
      // ??? Custom AI API (OpenAI-compatible)
      try {
        let apiEndpoint: string;
        if (endpoint.endsWith('/chat/completions')) {
          apiEndpoint = endpoint;
        } else if (endpoint.endsWith('/v1')) {
          apiEndpoint = `${endpoint}/chat/completions`;
        } else {
          // /v1/chat/completions ????? ??
          apiEndpoint = `${endpoint.replace(/\/$/, '')}/v1/chat/completions`;
        }

        const testText = "What is the capital of France?";
        
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "ngrok-skip-browser-warning": "true", // ???? ngrok-free
          },
          body: JSON.stringify({
            model: model || "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: testText,
              },
            ],
            max_tokens: 50,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const messageContent = data.choices?.[0]?.message?.content || "???? ?????? ??";
          result = {
            success: true,
            message: "? Custom AI API ? ??? ?? ????? ??? ???????!",
            details: {
              endpoint: apiEndpoint,
              model: model || "gpt-4o-mini",
              response: messageContent.substring(0, 100),
            },
          };
        } else {
          const errorText = await response.text().catch(() => "Unknown error");
          result = {
            success: false,
            message: `? ??? ?? Custom AI API (${response.status})`,
            details: {
              endpoint: apiEndpoint,
              model: model || "gpt-4o-mini",
              status: response.status,
              error: errorText.substring(0, 300),
              hint: "????? endpoint? API key ? ??? ?? ????? ????. endpoint ???? ?????? ?? OpenAI API ????.",
            },
          };
        }
      } catch (error: any) {
        result = {
          success: false,
          message: `? ??? ?? ????? ?? Custom AI API: ${error instanceof Error ? error.message : "???? ????????"}`,
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } else if (provider === "gemini") {
      // ??? Google Gemini API
      try {
        const testModel = model?.trim() || "gemini-2.5-flash";
        const testText = "What is the capital of France?";
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: testText,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const messageContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "???? ?????? ??";
          result = {
            success: true,
            message: `? Google Gemini API ? ??? ${testModel} ?? ????? ??? ???????!`,
            details: {
              model: testModel,
              response: messageContent.substring(0, 100),
              usage: data.usageMetadata,
              note: "Gemini API ?? ?????? ??? ??",
            },
          };
        } else if (response.status === 401 || response.status === 403) {
          result = {
            success: false,
            message: "? API key ??????? ???",
            details: {
              hint: "????? API key ?? ?? https://aistudio.google.com/apikey ?????? ????",
              helpUrl: "https://aistudio.google.com/apikey",
            },
          };
        } else if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          result = {
            success: false,
            message: `? ??? ?? ??????? (${response.status})`,
            details: {
              model: testModel,
              status: response.status,
              error: errorData.error?.message || "Invalid request",
              hint: "????? ??? ??? ?? ????? ????. ??????? ?????: gemini-2.5-flash, gemini-2.5-pro, gemini-3-flash-preview, gemini-3-pro",
            },
          };
        } else if (response.status === 429) {
          result = {
            success: false,
            message: "?? Rate limit exceeded",
            details: {
              hint: "????? ??? ???? ??? ???? ? ?????? ??? ????",
              helpUrl: "https://ai.google.dev/gemini-api/docs/pricing",
            },
          };
        } else {
          const errorText = await response.text().catch(() => "Unknown error");
          result = {
            success: false,
            message: `? ??? ?? Gemini API (${response.status})`,
            details: {
              model: testModel,
              status: response.status,
              error: errorText.substring(0, 300),
              hint: "????? API key ? ??? ??? ?? ????? ????.",
            },
          };
        }
      } catch (error: any) {
        result = {
          success: false,
          message: `? ??? ?? ????? ?? Gemini API: ${error instanceof Error ? error.message : "???? ????????"}`,
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error testing AI provider:", error);
    return NextResponse.json(
      {
        success: false,
        message: "??? ?? ??? API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

