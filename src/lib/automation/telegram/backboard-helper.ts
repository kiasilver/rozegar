/**
 * Backboard AI Helper
 * Sends messages to Backboard API (OpenAI-compatible) and estimates token usage.
 */

interface BackboardConfig {
    apiKey: string;
    endpoint: string;
    model: string;
    assistantId?: string;
}

/**
 * Send a message to the Backboard AI API
 */
export async function sendMessageToBackboard(
    prompt: string,
    config: BackboardConfig,
    systemPrompt?: string
): Promise<string | null> {
    const { apiKey, endpoint, model } = config;
    // Remove trailing slash from endpoint
    const baseUrl = endpoint.replace(/\/$/, '');

    // 0. Auth Headers
    const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey, // Correct header per docs
    };

    try {
        // 1. Find or Create Assistant
        // First, check if we have one (optimization: we could cache this ID if we had state, 
        // strictly speaking we should look it up or create a new one).
        // For now, let's try to list and find "Rozeghar Automation"
        let assistantId = config.assistantId;
        // استفاده از مدل صحیح - اگر مدل Gemini است، از مدل Backboard استفاده کن
        const actualModel = model?.includes('gemini') ? 'gpt-3.5-turbo' : (model || 'gpt-3.5-turbo');
        const assistantName = `Rozeghar Automation - ${actualModel}`;

        if (!assistantId) {
            console.log(`[Backboard] 🔍 Searching for existing assistant (${assistantName})...`);
            const listResponse = await fetch(`${baseUrl}/assistants`, { method: 'GET', headers });
            if (listResponse.ok) {
                const assistants = await listResponse.json();
                // Assuming assistants is an array or { assistants: [] }
                // Docs didn't specify list format, assume array or standard page
                const list = Array.isArray(assistants) ? assistants : (assistants.assistants || []);
                const found = list.find((a: any) => a.name === assistantName);
                if (found) {
                    assistantId = found.assistant_id || found.id;
                    console.log(`[Backboard] ✅ Found existing assistant: ${assistantId}`);
                }
            }
        }

        if (!assistantId) {
            console.log(`[Backboard] 🆕 Creating new assistant...`);
            const createResponse = await fetch(`${baseUrl}/assistants`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: assistantName,
                    system_prompt: systemPrompt || "You are a helpful assistant.",
                    model: actualModel // استفاده از مدل صحیح (نه Gemini)
                })
            });
            if (!createResponse.ok) {
                const err = await createResponse.text().catch(() => '');
                throw new Error(`Failed to create assistant: ${createResponse.status} ${err}`);
            }
            const created = await createResponse.json();
            assistantId = created.assistant_id || created.id;
        }

        if (!assistantId) throw new Error("Could not obtain Assistant ID");

        // 2. Create Thread
        console.log(`[Backboard] 🧵 Creating thread for assistant ${assistantId}...`);
        const threadResponse = await fetch(`${baseUrl}/assistants/${assistantId}/threads`, {
            method: 'POST',
            headers,
            body: JSON.stringify({})
        });
        if (!threadResponse.ok) {
            const err = await threadResponse.text().catch(() => '');
            throw new Error(`Failed to create thread: ${threadResponse.status} ${err}`);
        }
        const thread = await threadResponse.json();
        const threadId = thread.thread_id || thread.id;

        // 3. Send Message
        // 3. Send Message
        console.log(`[Backboard] 🚀 Sending message to thread ${threadId} (Prompt: ${prompt.length} chars)...`);

        // Use URLSearchParams for application/x-www-form-urlencoded
        const bodyParams = new URLSearchParams();
        bodyParams.append('role', 'user');
        bodyParams.append('content', prompt);
        bodyParams.append('stream', 'false');

        const messageResponse = await fetch(`${baseUrl}/threads/${threadId}/messages`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: bodyParams.toString()
        });

        if (!messageResponse.ok) {
            const err = await messageResponse.text().catch(() => '');
            throw new Error(`Backboard API error (${messageResponse.status}): ${err.substring(0, 200)}`);
        }

        const data = await messageResponse.json();
        // Docs say: print(response.json().get("content"))
        return data.content || data.message || null;

    } catch (error: any) {
        console.error(`[Backboard] ❌ Error: ${error.message}`);
        throw error;
    }
}

/**
 * Estimate token usage from a Backboard response text
 */
export function getBackboardTokenUsage(responseText: string): {
    model: string;
    inputTokens: number;
    outputTokens: number;
} | null {
    if (!responseText) return null;

    // Estimate tokens (~4 chars per token)
    const estimatedOutputTokens = Math.ceil(responseText.length / 4);
    return {
        model: 'backboard',
        inputTokens: 0, // unknown from response alone
        outputTokens: estimatedOutputTokens,
    };
}
