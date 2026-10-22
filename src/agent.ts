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

export const MAX_LOOP_STEPS = 5;

const SYSTEM_PROMPT = `You are a helpful AI assistant operating in a Cloudflare Worker environment.
You have access to 3 Meta-MCP gateway tools to dynamically connect to tools on demand:
1. mount_mcp_server: Mount remote HTTP MCP servers into your session.
2. discover_tools: Search for tools and get their full input parameter schemas.
3. run_tool: Execute tools using namespaced names (e.g., 'pg.describe_table').

When the user asks you to interact with an external service or MCP server:
- Mount the server first if not yet mounted.
- Discover relevant tools by query keyword to inspect their parameters.
- Call run_tool with the appropriate arguments.
Never ask the user for raw API keys; reference them using environment secret names if required.`;

/**
 * Default OpenAI-compatible LLM completion handler via standard fetch.
 */
export const defaultOpenAICompletionHandler: LLMCompletionHandler = async (
  messages,
  tools,
  env
) => {
  const baseUrl = (env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.LLM_MODEL || "gpt-4o-mini";
  const apiKey = env.LLM_API_KEY;

  if (!apiKey) {
    throw new Error("Missing LLM_API_KEY in Worker environment.");
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LLM provider returned HTTP ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as any;
  const choice = data?.choices?.[0]?.message;

  return {
    content: choice?.content ?? null,
    tool_calls: choice?.tool_calls,
  };
};

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
  const llmHandler = options?.llmHandler ?? defaultOpenAICompletionHandler;

  // 1. Load session state from Cloudflare KV
  const sessionState: SessionState = await getSessionState(sessionId, env);

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
    const completion = await llmHandler(messages, META_MCP_TOOLS, env);

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
        toolResult = discoverTools(parsedArgs, sessionState);
      } else if (toolName === "run_tool") {
        toolResult = await runTool(
          parsedArgs,
          env,
          sessionState,
          {
            allowLocalhost: options?.allowLocalhost,
            fetchFn: options?.fetchFn,
            nativeHandlers: options?.nativeHandlers,
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
      const finalComp = await llmHandler(messages, [], env);
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
