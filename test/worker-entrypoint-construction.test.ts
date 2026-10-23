import { describe, it, expect } from "vitest";
import { WorkerEntrypoint, DurableObject } from "cloudflare:workers";
import { MeetingNotesConnector } from "@/src/connectors/meeting-notes-connector";
import { BrowserRunConnector } from "@/src/connectors/browser-connector";
import { SpikeMcpConnector } from "@/src/connectors/spike-mcp-connector";
import { CodemodeAgent } from "@/src/codemode-agent";
import { getInternalNativeTools, getDefaultNativeHandlers } from "@/src/native-tools";
import { executeAgentLoop } from "@/src/agent";
import { Env, ChatRequest } from "@/src/types";

describe("WorkerEntrypoint & Connector Robust Construction", () => {
  it("rejects non-object ctx in base WorkerEntrypoint mock (matching workerd runtime behavior)", () => {
    expect(() => new WorkerEntrypoint(null as any, {})).toThrow(
      "Failed to construct 'WorkerEntrypoint': constructor parameter 1 is not of type 'Object'."
    );
    expect(() => new WorkerEntrypoint(undefined as any, {})).toThrow(
      "Failed to construct 'WorkerEntrypoint': constructor parameter 1 is not of type 'Object'."
    );
    expect(() => new WorkerEntrypoint("not-an-object" as any, {})).toThrow(
      "Failed to construct 'WorkerEntrypoint': constructor parameter 1 is not of type 'Object'."
    );
    expect(() => new WorkerEntrypoint({}, {})).not.toThrow();
  });

  it("rejects non-object ctx in base DurableObject mock", () => {
    expect(() => new DurableObject(null as any, {})).toThrow(
      "Failed to construct 'DurableObject': constructor parameter 1 is not of type 'Object'."
    );
    expect(() => new DurableObject({}, {})).not.toThrow();
  });

  it("safely constructs MeetingNotesConnector even if ctx is null or undefined", () => {
    expect(() => new MeetingNotesConnector(null, {} as any)).not.toThrow();
    expect(() => new MeetingNotesConnector(undefined, {} as any)).not.toThrow();
    const conn = new MeetingNotesConnector(null, {} as any);
    expect(conn.name()).toBe("meetings");
    expect(conn.getToolMap().create_meeting).toBeDefined();
  });

  it("safely constructs BrowserRunConnector even if ctx is null or undefined", () => {
    expect(() => new BrowserRunConnector(null, {} as any)).not.toThrow();
    expect(() => new BrowserRunConnector(undefined, {} as any)).not.toThrow();
    const conn = new BrowserRunConnector(null, {} as any);
    expect(conn.name()).toBe("browser");
  });

  it("safely constructs SpikeMcpConnector even if ctx is null or undefined", () => {
    const server = { namespace: "test", url: "https://example.com/mcp" };
    expect(() => new SpikeMcpConnector(null, {} as any, server as any)).not.toThrow();
    expect(() => new SpikeMcpConnector(undefined, {} as any, server as any)).not.toThrow();
    const conn = new SpikeMcpConnector(null, {} as any, server as any);
    expect(conn.name()).toBe("test");
  });

  it("safely constructs CodemodeAgent even if ctx is null or undefined", () => {
    expect(() => new CodemodeAgent(null, {})).not.toThrow();
    expect(() => new CodemodeAgent(undefined, {})).not.toThrow();
  });

  it("loads native tools and handlers without WorkerEntrypoint construction errors", () => {
    const tools = getInternalNativeTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t) => t.namespacedName.startsWith("meetings."))).toBe(true);

    const handlers = getDefaultNativeHandlers({} as Env);
    expect(handlers["meetings.create_meeting"]).toBeDefined();
    expect(handlers["meetings.list_meetings"]).toBeDefined();
  });

  it("executes executeAgentLoop without throwing WorkerEntrypoint construction error", async () => {
    const env: Env = {
      SESSION_KV: undefined as any,
    };
    const req: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    const result = await executeAgentLoop(req, env, {
      llmHandler: async () => ({
        content: "Hello! How can I assist you today?",
        tool_calls: [],
      }),
    });

    expect(result.response).toBe("Hello! How can I assist you today?");
  });
});
