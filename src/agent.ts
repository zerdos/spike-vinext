/**
 * Cloudflare Worker Agent Loop (MVP)
 * PRD Section 1, 2.1 & 7
 * Runs a multi-turn LLM tool-calling loop (up to 5 steps per request) backed by Cloudflare KV.
 */

import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Env,
  LLMCompletionHandler,
  SessionState,
  ToolCall,
} from "./types.js";
import {
  META_MCP_TOOLS,
  getSessionState,
  saveSessionState,
  mountMcpServer,
  discoverTools,
  runTool,
} from "./meta-mcp.js";
import {
  getInternalNativeTools,
  getDefaultNativeHandlers,
} from "./native-tools.js";

export const MAX_LOOP_STEPS = 5;

export const SYSTEM_PROMPT = `You are a helpful AI assistant operating in a Cloudflare Worker environment with Spike Land Meta-MCP capabilities.
You have access to 3 Meta-MCP gateway tools to dynamically connect to and execute tools on demand:
1. discover_tools: Search for tools and get their full input parameter schemas. Built-in tools for web browsing, scraping, content extraction, and markdown conversion (under the 'browser' namespace) are already available immediately!
2. run_tool: Execute tools using namespaced names (e.g. 'browser.markdown', 'browser.content', 'browser.scrape', or 'pg.describe_table').
3. mount_mcp_server: Mount remote HTTP MCP servers into your session when connecting to an external service or when the user provides an MCP server URL. (Canonical Browser MCP: 'https://spike-browser-run-mcp.spikeland.workers.dev/mcp').

When asked to browse the web, read a webpage, or fetch live news from a URL:
- Always call discover_tools first (e.g. { query: "browser" } or { query: "markdown" }) to inspect available tools and parameter schemas.
- Then call run_tool with the appropriate namespaced tool name (e.g. 'browser.markdown' with arguments: { url: "https://..." }).
- Only call mount_mcp_server if you need an external remote MCP server not already provided.
Never ask the user for raw API keys; reference them using environment secret names if required.`;

export const DEFAULT_CHAT_MODEL = "deepseek/deepseek-v4.1-flash";

const GEMINI_DEFAULT_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
];

/**
 * Default LLM completion handler supporting OPENROUTER_API_KEY, GEMINI_API_KEY, and OpenAI/LLM_API_KEY
 * via standard fetch with automatic capacity fallback for high-demand spikes (503/429).
 */
export const defaultCompletionHandler: LLMCompletionHandler = async (
  messages,
  tools,
  env,
  requestedModel
) => {
  const isOpenRouter = Boolean(
    env.OPENROUTER_API_KEY ||
      (requestedModel && requestedModel.includes("/")) ||
      (env.LLM_MODEL && env.LLM_MODEL.includes("/")) ||
      (env.LLM_BASE_URL && env.LLM_BASE_URL.includes("openrouter.ai"))
  );

  const isGemini = !isOpenRouter && Boolean(
    env.GEMINI_API_KEY ||
      (env.LLM_API_KEY && env.LLM_API_KEY.startsWith("AIza")) ||
      (requestedModel && requestedModel.toLowerCase().includes("gemini")) ||
      (env.LLM_MODEL && env.LLM_MODEL.toLowerCase().includes("gemini"))
  );

  const apiKey = (
    isOpenRouter
      ? (env.OPENROUTER_API_KEY || env.LLM_API_KEY || env.GEMINI_API_KEY)
      : (env.GEMINI_API_KEY || env.LLM_API_KEY)
  ) as string | undefined;

  if (!apiKey) {
    throw new Error(
      "Missing OPENROUTER_API_KEY, GEMINI_API_KEY, or LLM_API_KEY in Worker environment."
    );
  }

  const defaultBaseUrl = isOpenRouter
    ? "https://openrouter.ai/api/v1"
    : isGemini
    ? "https://generativelanguage.googleapis.com/v1beta/openai"
    : "https://api.openai.com/v1";
  const baseUrl = (env.LLM_BASE_URL || defaultBaseUrl).replace(/\/$/, "");

  const modelsToTry = requestedModel
    ? [requestedModel]
    : isOpenRouter
    ? [env.LLM_MODEL || DEFAULT_CHAT_MODEL]
    : isGemini
    ? env.LLM_MODEL
      ? [env.LLM_MODEL]
      : GEMINI_DEFAULT_MODELS
    : [env.LLM_MODEL || DEFAULT_CHAT_MODEL];

  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const bodyPayload: Record<string, unknown> = {
      model,
      messages,
    };
    if (tools.length > 0) {
      bodyPayload.tools = tools;
      bodyPayload.tool_choice = "auto";
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      if (isOpenRouter) {
        headers["HTTP-Referer"] = "https://spike.land";
        headers["X-Title"] = "Spike Land";
      }

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        // If 503 (high demand) or 429 (rate limit) and we have fallback models left, try next
        if ((res.status === 503 || res.status === 429) && i < modelsToTry.length - 1) {
          lastError = new Error(`Model ${model} returned HTTP ${res.status}: ${errorText}`);
          continue;
        }
        throw new Error(`LLM provider returned HTTP ${res.status}: ${errorText}`);
      }

      const data = (await res.json()) as any;
      const choice = data?.choices?.[0]?.message;

      return {
        content: choice?.content ?? null,
        tool_calls: choice?.tool_calls,
      };
    } catch (err: unknown) {
      lastError = err as Error;
      if (i === modelsToTry.length - 1) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("Failed to get completion from LLM provider.");
};

export const defaultOpenAICompletionHandler = defaultCompletionHandler;

export interface AgentLoopOptions {
  llmHandler?: LLMCompletionHandler;
  allowLocalhost?: boolean;
  fetchFn?: typeof fetch;
  maxSteps?: number;
  nativeHandlers?: Record<string, (args: any) => Promise<any> | any>;
}

/**
 * Executes the multi-turn agent tool loop (up to 5 steps)
 */
export async function executeAgentLoop(
  request: ChatRequest,
  env: Env,
  options?: AgentLoopOptions
): Promise<ChatResponse> {
  const sessionId = request.sessionId || `sess_${crypto.randomUUID()}`;
  const maxSteps = options?.maxSteps ?? MAX_LOOP_STEPS;
  const llmHandler = options?.llmHandler ?? defaultCompletionHandler;

  const defaultModel =
    env.OPENROUTER_API_KEY || (!env.GEMINI_API_KEY && !env.LLM_API_KEY)
      ? (env.LLM_MODEL || DEFAULT_CHAT_MODEL)
      : env.LLM_MODEL;
  const requestedModel = request.model || defaultModel;

  // 1. Load session state from Cloudflare KV
  const sessionState: SessionState = await getSessionState(sessionId, env);

  // 1b. Load built-in native tools and handlers
  const nativeTools = getInternalNativeTools();
  const defaultHandlers = getDefaultNativeHandlers(env);
  const combinedHandlers = {
    ...defaultHandlers,
    ...options?.nativeHandlers,
  };

  // 2. Prepare conversation messages
  const messages: ChatMessage[] = [];

  // Add system prompt if not present
  const hasSystem = request.messages?.some((m) => m.role === "system");
  if (!hasSystem) {
    messages.push({ role: "system", content: SYSTEM_PROMPT });
  }

  if (request.messages && request.messages.length > 0) {
    messages.push(...request.messages);
  } else if (request.message) {
    messages.push({ role: "user", content: request.message });
  }

  const toolsUsed: string[] = [];
  let finalResponse = "";
  let turns = 0;

  // 3. Multi-turn execution loop (up to maxSteps)
  for (let step = 0; step < maxSteps; step++) {
    turns++;

    // Call LLM
    const completion = await llmHandler(messages, META_MCP_TOOLS, env, requestedModel);

    const toolCalls: ToolCall[] = completion.tool_calls || [];

    // If no tool calls, this is the final assistant response
    if (toolCalls.length === 0) {
      finalResponse = completion.content || "";
      messages.push({
        role: "assistant",
        content: finalResponse,
      });
      break;
    }

    // Append assistant's tool_calls message
    messages.push({
      role: "assistant",
      content: completion.content,
      tool_calls: toolCalls,
    });

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      let parsedArgs: any = {};
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        parsedArgs = {};
      }

      toolsUsed.push(toolName);
      let toolResult: any;

      if (toolName === "mount_mcp_server") {
        toolResult = await mountMcpServer(
          parsedArgs,
          env,
          sessionState,
          {
            allowLocalhost: options?.allowLocalhost,
            fetchFn: options?.fetchFn,
          }
        );
      } else if (toolName === "discover_tools") {
        toolResult = discoverTools(parsedArgs, sessionState, nativeTools);
      } else if (toolName === "run_tool") {
        toolResult = await runTool(
          parsedArgs,
          env,
          sessionState,
          {
            allowLocalhost: options?.allowLocalhost,
            fetchFn: options?.fetchFn,
            nativeHandlers: combinedHandlers,
          }
        );
      } else {
        toolResult = {
          error: {
            code: -32601,
            message: `Unknown gateway tool '${toolName}'. Available tools: mount_mcp_server, discover_tools, run_tool.`,
          },
        };
      }

      // Append tool response message
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolName,
        content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
      });
    }

    // If we've reached maxSteps - 1, in the next iteration we can ask the LLM for a final synthesis
    if (step === maxSteps - 1) {
      // One final completion to summarize if loop limit reached
      const finalComp = await llmHandler(messages, [], env, requestedModel);
      finalResponse = finalComp.content || "";
      messages.push({
        role: "assistant",
        content: finalResponse,
      });
      break;
    }
  }

  // 4. Save updated session state to Cloudflare KV
  await saveSessionState(sessionState, env);

  return {
    sessionId,
    response: finalResponse,
    messages,
    turns,
    toolsUsed,
  };
}
