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
  ToolApprovalPolicy,
  WorkerLoaderBinding,
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
import {
  createSpikeCodemodeRuntime,
  CodemodeRuntimeHandle,
} from "./codemode-runtime.js";
import { Executor } from "@cloudflare/codemode";

export const MAX_LOOP_STEPS = 5;

export const SYSTEM_PROMPT = `You are a helpful AI assistant operating in a Cloudflare Worker environment with Spike Land Meta-MCP and Durable Code Mode capabilities.
You have access to 8 Meta-MCP & Durable Code Mode tools:
1. discover_tools: Search tools and saved snippets with format "json_schema" or compact "typescript" signatures. Built-in tools for web browsing and scraping (under 'browser'), real-time search (under 'serpapi.search'), and meeting notes & knowledge base (under 'meetings' - create_meeting, update_meeting, add_transcript, get_transcript, save_summary, add_questions, update_question, add_action_items, update_action_item, list_questions, list_meetings, search_meetings, get_meeting, delete_meeting) are available immediately!
2. run_tool: Direct execution for simple, single-step tool calls (e.g. 'browser.markdown', 'serpapi.search', 'meetings.create_meeting', 'meetings.list_meetings').
3. mount_mcp_server: Mount remote HTTP MCP servers into your session (e.g., PostgreSQL, GitHub, Linear, or custom SerpApi endpoints).
4. codemode: Primary orchestration engine! Write and execute an async JavaScript/TypeScript program in an isolated V8 sandbox (\`async () => { ... }\`) to orchestrate multiple tools, loop, filter intermediate payloads in memory, query connectors (e.g. \`await serpapi.search(...)\`, \`await browser.markdown(...)\`, \`await meetings.list_meetings(...)\`), or use in-sandbox discovery (\`await codemode.search(...)\`, \`await codemode.describe(...)\`, \`await codemode.run(...)\`).
5. save_codemode_snippet: Save a successful codemode routine into durable SQLite memory for instant future reuse.
6. list_pending_executions: Check paused executions awaiting human approval.
7. resolve_execution_approval: Resume ('approve') or cancel ('reject') a paused execution.
8. rollback_execution: Undo side effects of an execution via connector compensation logic.

Tool Selection Guidelines:
- Use \`run_tool\` for simple, 1-step atomic tool calls (e.g. fetching markdown from a single URL, searching, or logging a meeting note).
- Use \`codemode\` whenever a task requires:
  * Chaining 2 or more tools together (e.g. search with \`serpapi.search\` and scrape top links with \`browser.markdown\`, or querying past meetings and summarizing open questions).
  * Filtering, mapping, or transforming intermediate data before returning it or passing it to the next tool (keeps chat context small and fast).
  * Branching or conditional logic (e.g. if price > X, create alert).
  * Calling a saved procedural routine (\`await codemode.run(...)\`).
- When users ask about meetings (creating, transcribing, summarizing, logging questions/decisions, or browsing/searching older notes), use the \`meetings\` tools with normalized dates (YYYY-MM-DD). When relative dates ('today', 'yesterday', 'tomorrow') are mentioned, normalize them to YYYY-MM-DD. When a user pastes a raw transcript, automatically synthesize an executive summary, key decisions, takeaways, questions, and action items in a single turn.
Never ask the user for raw API keys; reference them using environment secret names if required.`;

export const DEFAULT_CHAT_MODEL = "deepseek/deepseek-v4.1-flash-1017";

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
  codemodeRuntime?: CodemodeRuntimeHandle;
  durableObjectState?: any;
  approvalPolicy?: ToolApprovalPolicy;
  revertHandler?: (
    toolName: string,
    args: unknown,
    result: unknown
  ) => Promise<void> | void;
  loader?: WorkerLoaderBinding;
  executor?: Executor;
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

  // 1c. Initialize or resolve Durable Codemode Runtime for this session
  let codemodeRuntime: CodemodeRuntimeHandle;
  if (options?.codemodeRuntime) {
    codemodeRuntime = options.codemodeRuntime;
  } else if (env.CODEMODE_AGENT && typeof env.CODEMODE_AGENT.idFromName === "function") {
    const doId = env.CODEMODE_AGENT.idFromName(sessionState.sessionId);
    const stub = env.CODEMODE_AGENT.get(doId);
    codemodeRuntime = {
      execute: (code: string) => stub.execute(sessionState, code),
      pending: () => stub.pending(sessionState),
      approve: (params: { executionId: string }) => stub.approve(sessionState, params.executionId),
      reject: (params: { executionId: string; reason?: string }) => stub.reject(sessionState, params.executionId, params.reason),
      rollback: (params: { executionId: string }) => stub.rollback(sessionState, params.executionId),
      snippets: () => stub.snippets(sessionState),
      saveSnippet: (params: { name: string; code: string; description?: string }) =>
        stub.saveSnippet(sessionState, params.name, params.code, params.description),
    } as unknown as CodemodeRuntimeHandle;
  } else {
    codemodeRuntime = createSpikeCodemodeRuntime(
      options?.durableObjectState,
      env,
      sessionState,
      {
        allowLocalhost: options?.allowLocalhost,
        fetchFn: options?.fetchFn,
        browserHandlers: combinedHandlers,
        approvalPolicy: options?.approvalPolicy,
        revertHandler: options?.revertHandler,
        loader: options?.loader,
        executor: options?.executor,
      }
    );
  }

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
        const snippets = await codemodeRuntime.snippets().catch(() => []);
        toolResult = discoverTools(parsedArgs, sessionState, nativeTools, snippets);
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
      } else if (toolName === "codemode") {
        try {
          const res = await codemodeRuntime.execute({ code: parsedArgs.code });
          if (res.status === "paused") {
            toolResult = {
              status: "pending_approval",
              executionId: res.executionId,
              pending: res.pending,
              calls: res.calls,
              message: "Execution paused awaiting human approval for sensitive mutation.",
            };
          } else if (res.status === "error") {
            toolResult = {
              status: "error",
              executionId: res.executionId,
              error: res.error,
              logs: res.logs,
              calls: res.calls,
            };
          } else {
            toolResult = {
              status: "completed",
              executionId: res.executionId,
              result: res.result,
              logs: res.logs,
              calls: res.calls,
            };
          }
        } catch (err: any) {
          toolResult = {
            status: "error",
            error: err?.message || String(err),
          };
        }
      } else if (toolName === "save_codemode_snippet") {
        try {
          let execId = parsedArgs.executionId;
          if (!execId && parsedArgs.code) {
            const tempRun = await codemodeRuntime.execute({ code: parsedArgs.code });
            execId = tempRun.executionId;
          }
          if (!execId) {
            toolResult = {
              error: "Missing required 'executionId' or 'code' to save snippet from.",
            };
          } else {
            const snippet = await codemodeRuntime.saveSnippet(parsedArgs.name, {
              executionId: execId,
              description: parsedArgs.description,
              inputSchema: parsedArgs.inputSchema,
            });
            toolResult = {
              status: "saved",
              snippet,
            };
          }
        } catch (err: any) {
          toolResult = {
            error: err?.message || String(err),
          };
        }
      } else if (toolName === "list_pending_executions") {
        try {
          const pending = await codemodeRuntime.pending(parsedArgs.executionId);
          toolResult = {
            pending,
          };
        } catch (err: any) {
          toolResult = {
            error: err?.message || String(err),
          };
        }
      } else if (toolName === "resolve_execution_approval") {
        try {
          if (parsedArgs.decision === "approve") {
            const approved = await codemodeRuntime.approve({ executionId: parsedArgs.executionId });
            toolResult = {
              status: approved.status,
              result: (approved as any).result,
              executionId: approved.executionId,
            };
          } else {
            const rejected = await codemodeRuntime.reject({
              executionId: parsedArgs.executionId,
              seq: parsedArgs.seq ?? 1,
            });
            toolResult = {
              status: "rejected",
              success: rejected,
              executionId: parsedArgs.executionId,
            };
          }
        } catch (err: any) {
          toolResult = {
            error: err?.message || String(err),
          };
        }
      } else if (toolName === "rollback_execution") {
        try {
          await codemodeRuntime.rollback({ executionId: parsedArgs.executionId });
          toolResult = {
            status: "rolled_back",
            executionId: parsedArgs.executionId,
          };
        } catch (err: any) {
          toolResult = {
            error: err?.message || String(err),
          };
        }
      } else {
        toolResult = {
          error: {
            code: -32601,
            message: `Unknown gateway tool '${toolName}'. Available tools: mount_mcp_server, discover_tools, run_tool, codemode, save_codemode_snippet, list_pending_executions, resolve_execution_approval, rollback_execution.`,
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
