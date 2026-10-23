import { describe, it, expect, beforeEach } from "vitest";
import {
  MeetingNotesStore,
  normalizeMeetingDate,
  parseTranscriptSegments,
  resetInMemoryMeetingStore,
} from "../lib/meeting-notes.js";
import { MeetingNotesConnector } from "../src/connectors/meeting-notes-connector.js";
import { discoverTools, runTool } from "../src/meta-mcp.js";
import { createSpikeCodemodeRuntime, createMockDurableObjectState } from "../src/codemode-runtime.js";
import { SessionState } from "../src/types.js";

describe("Meeting Notes Engine & Store (PRD: prds/meetingNotes.md)", () => {
  let store: MeetingNotesStore;

  beforeEach(() => {
    resetInMemoryMeetingStore();
    store = new MeetingNotesStore();
  });

  it("normalizes meeting dates correctly", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(normalizeMeetingDate("today")).toBe(today);
    expect(normalizeMeetingDate("2026-10-22")).toBe("2026-10-22");
    expect(normalizeMeetingDate("2026-10-22T14:30:00Z")).toBe("2026-10-22");
    expect(normalizeMeetingDate("")).toBe(today);
  });

  it("parses raw transcript text into speaker turns", () => {
    const raw = `[Alice 00:01:15]: Let's start the meeting on SQLite storage.
[Bob 00:02:00]: Has the PRD been approved?
Charlie: Yes, Zoltan reviewed it earlier today.`;

    const segments = parseTranscriptSegments(raw);
    expect(segments.length).toBe(3);
    expect(segments[0].speaker).toBe("Alice");
    expect(segments[0].timestamp).toBe("00:01:15");
    expect(segments[0].text).toBe("Let's start the meeting on SQLite storage.");
    expect(segments[1].speaker).toBe("Bob");
    expect(segments[2].speaker).toBe("Charlie");
    expect(segments[2].text).toBe("Yes, Zoltan reviewed it earlier today.");
  });

  it("creates a meeting with date, participants, tags, and summary", async () => {
    const saved = await store.saveMeeting({
      id: "mtg_20261022_test1",
      title: "Q4 Edge Architecture Sync",
      meetingDate: "2026-10-22",
      startTime: "14:00 UTC",
      status: "completed",
      participants: ["Alice", "Bob", "Zoltan"],
      tags: ["architecture", "edge"],
      transcriptText: "Alice: We need fast durable storage. Bob: Let's use SQLite.",
      transcriptSegments: [
        { id: "s1", speaker: "Alice", text: "We need fast durable storage.", createdAt: Date.now() },
        { id: "s2", speaker: "Bob", text: "Let's use SQLite.", createdAt: Date.now() },
      ],
      summary: {
        executiveSummary: "Agreed to use DO SQLite with KV sync for meeting notes.",
        keyDecisions: ["Use SQLite storage", "Support Code Mode connector"],
        takeaways: ["Sub-millisecond query latency"],
        topics: ["Storage Architecture", "Runtime Connectors"],
        updatedAt: Date.now(),
      },
      questions: [
        {
          id: "q_1",
          meetingId: "mtg_20261022_test1",
          question: "Does SQLite support full text search?",
          askedBy: "Alice",
          status: "open",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      actionItems: [
        {
          id: "ai_1",
          meetingId: "mtg_20261022_test1",
          task: "Implement MeetingNotesConnector",
          owner: "Zoltan",
          dueDate: "2026-10-24",
          status: "in_progress",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(saved.id).toBe("mtg_20261022_test1");
    expect(saved.meetingDate).toBe("2026-10-22");

    const fetched = await store.getMeeting("mtg_20261022_test1");
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("Q4 Edge Architecture Sync");
    expect(fetched?.questions.length).toBe(1);
    expect(fetched?.summary?.keyDecisions.length).toBe(2);
  });

  it("retrieves meetings by title case-insensitively", async () => {
    await store.saveMeeting({
      id: "mtg_20261015_standup",
      title: "Sprint Planning",
      meetingDate: "2026-10-15",
      status: "completed",
      participants: ["Alice"],
      tags: ["sprint"],
      transcriptText: "Sprint planning notes.",
      transcriptSegments: [],
      questions: [],
      actionItems: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const match = await store.getMeeting("sprint planning");
    expect(match).not.toBeNull();
    expect(match?.id).toBe("mtg_20261015_standup");
  });

  it("lists and filters older meetings chronologically", async () => {
    await store.saveMeeting({
      id: "m1",
      title: "Early October Retro",
      meetingDate: "2026-10-05",
      status: "completed",
      participants: ["Bob"],
      tags: ["retro"],
      transcriptText: "",
      transcriptSegments: [],
      questions: [],
      actionItems: [],
      createdAt: 100,
      updatedAt: 100,
    });

    await store.saveMeeting({
      id: "m2",
      title: "Late October Review",
      meetingDate: "2026-10-20",
      status: "completed",
      participants: ["Alice", "Bob"],
      tags: ["review"],
      transcriptText: "",
      transcriptSegments: [],
      questions: [],
      actionItems: [],
      createdAt: 200,
      updatedAt: 200,
    });

    const all = await store.listMeetings();
    expect(all.total).toBe(2);
    // Ordered descending by meetingDate
    expect(all.meetings[0].id).toBe("m2");
    expect(all.meetings[1].id).toBe("m1");

    // Filter by date range
    const filteredDate = await store.listMeetings({
      dateFrom: "2026-10-10",
      dateTo: "2026-10-31",
    });
    expect(filteredDate.total).toBe(1);
    expect(filteredDate.meetings[0].id).toBe("m2");

    // Filter by participant
    const filteredAlice = await store.listMeetings({ participant: "alice" });
    expect(filteredAlice.total).toBe(1);
    expect(filteredAlice.meetings[0].title).toBe("Late October Review");
  });

  it("searches across transcripts, summaries, decisions, and questions", async () => {
    await store.saveMeeting({
      id: "m_search",
      title: "SerpApi Review Meeting",
      meetingDate: "2026-10-21",
      status: "completed",
      participants: ["Zoltan"],
      tags: ["mcp", "serpapi"],
      transcriptText: "We verified that SerpApi search runs in isolated V8 sandbox without leaking keys.",
      transcriptSegments: [],
      summary: {
        executiveSummary: "Zero-leakage secret interpolation confirmed.",
        keyDecisions: ["Use template placeholders for keys"],
        takeaways: ["Compact mode saves context tokens"],
        topics: ["SerpApi"],
        updatedAt: Date.now(),
      },
      questions: [
        {
          id: "q_serp",
          meetingId: "m_search",
          question: "Can we cache SerpApi responses in DO SQLite cm_log?",
          askedBy: "Zoltan",
          answer: "Yes, replay: 'log' handles it.",
          status: "answered",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      actionItems: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Search keyword in transcript
    const res1 = await store.searchMeetings("isolated V8 sandbox");
    expect(res1.total).toBe(1);
    expect(res1.results[0].matchedFields).toContain("transcriptText");
    expect(res1.results[0].transcriptSnippet).toContain("isolated V8 sandbox");

    // Search keyword in questions
    const res2 = await store.searchMeetings("cm_log");
    expect(res2.total).toBe(1);
    expect(res2.results[0].matchedFields).toContain("questions");
    expect(res2.results[0].matchedQuestions?.[0].question).toContain("cm_log");
  });

  it("lists questions across all meetings with status filter", async () => {
    await store.saveMeeting({
      id: "m_q1",
      title: "Meeting 1",
      meetingDate: "2026-10-18",
      status: "completed",
      participants: [],
      tags: [],
      transcriptText: "",
      transcriptSegments: [],
      questions: [
        {
          id: "q1",
          meetingId: "m_q1",
          question: "Is KV fallback active?",
          status: "open",
          askedBy: "Alice",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      actionItems: [],
      createdAt: 1,
      updatedAt: 1,
    });

    await store.saveMeeting({
      id: "m_q2",
      title: "Meeting 2",
      meetingDate: "2026-10-19",
      status: "completed",
      participants: [],
      tags: [],
      transcriptText: "",
      transcriptSegments: [],
      questions: [
        {
          id: "q2",
          meetingId: "m_q2",
          question: "Is D1 configured?",
          status: "answered",
          askedBy: "Bob",
          answer: "Yes.",
          createdAt: 2,
          updatedAt: 2,
        },
      ],
      actionItems: [],
      createdAt: 2,
      updatedAt: 2,
    });

    const openQuestions = await store.listQuestions({ status: "open" });
    expect(openQuestions.total).toBe(1);
    expect(openQuestions.questions[0].question).toBe("Is KV fallback active?");

    const answeredQuestions = await store.listQuestions({ status: "answered" });
    expect(answeredQuestions.total).toBe(1);
    expect(answeredQuestions.questions[0].question).toBe("Is D1 configured?");
  });
});

describe("Meeting Notes Meta-MCP & Native Tools Integration", () => {
  const mockEnv: any = {};
  const mockSession: SessionState = { sessionId: "test-sess", mountedServers: {} };

  beforeEach(() => {
    resetInMemoryMeetingStore();
  });

  it("discovers meetings.* tools in discover_tools", () => {
    const resCreate = discoverTools(
      { query: "create meeting" },
      mockSession
    );
    expect(resCreate.map((t) => t.namespacedName)).toContain("meetings.create_meeting");

    const resList = discoverTools(
      { query: "list older meetings" },
      mockSession
    );
    expect(resList.map((t) => t.namespacedName)).toContain("meetings.list_meetings");

    const resQuestions = discoverTools(
      { query: "list questions" },
      mockSession
    );
    expect(resQuestions.map((t) => t.namespacedName)).toContain("meetings.list_questions");
  });

  it("creates a meeting via run_tool('meetings.create_meeting')", async () => {
    const res = await runTool(
      {
        tool_name: "meetings.create_meeting",
        arguments: {
          title: "Weekly Engineering Standup",
          meetingDate: "2026-10-22",
          participants: ["Zoltan", "Alice"],
          tags: ["standup"],
          transcript: "Zoltan: Finished meeting notes PRD. Alice: Reviewing now.",
          summary: {
            executiveSummary: "PRD completed and reviewed.",
            keyDecisions: ["Ship meeting notes connector"],
            takeaways: ["Everything on track"],
            topics: ["Meeting notes"],
          },
          questions: [
            {
              question: "When do we release?",
              askedBy: "Alice",
              answer: "Today after test pass.",
            },
          ],
        },
      },
      mockEnv,
      mockSession
    );

    expect(res.error).toBeUndefined();
    expect(res.result).toBeDefined();
    const result = res.result as any;
    expect(result.status).toBe("created");
    expect(result.meetingDate).toBe("2026-10-22");
    expect(result.questionCount).toBe(1);

    // Now retrieve via run_tool
    const listRes = await runTool(
      {
        tool_name: "meetings.list_meetings",
        arguments: { onDate: "2026-10-22" },
      },
      mockEnv,
      mockSession
    );

    const listData = listRes.result as any;
    expect(listData.total).toBe(1);
    expect(listData.meetings[0].title).toBe("Weekly Engineering Standup");
  });
});

describe("Durable Code Mode Sandbox Execution with Meeting Notes", () => {
  beforeEach(() => {
    resetInMemoryMeetingStore();
  });

  it("executes multi-step meeting orchestration in isolated V8 sandbox", async () => {
    const mockEnv: any = {};
    const mockSession: SessionState = { sessionId: "cm-test", mountedServers: {} };
    const runtime = createSpikeCodemodeRuntime(null, mockEnv, mockSession);

    const code = `async () => {
      // 1. Create a meeting with date
      const created = await meetings.create_meeting({
        title: "Architecture Roundtable",
        meetingDate: "2026-10-22",
        participants: ["Zoltan", "Bob"],
        tags: ["architecture"],
        transcript: "[Zoltan 00:00]: Welcome everyone. [Bob 00:30]: Let's discuss Durable Code Mode."
      });

      // 2. Add summary
      await meetings.save_summary({
        meetingId: created.meetingId,
        executiveSummary: "Reviewed Durable Code Mode sandbox bindings.",
        keyDecisions: ["Register meetings connector on sandbox globals"],
        takeaways: ["Allows multi-step meetings orchestration in 1 turn"],
        topics: ["Code Mode", "Meeting Notes"]
      });

      // 3. Add questions
      await meetings.add_questions({
        meetingId: created.meetingId,
        questions: [
          { question: "Is delete_meeting protected by requiresApproval?", askedBy: "Bob", answer: "Yes", status: "answered" }
        ]
      });

      // 4. Retrieve older meeting notes
      const older = await meetings.list_meetings({ dateFrom: "2026-10-01" });

      return {
        meetingId: created.meetingId,
        totalFound: older.total,
        summaryDecision: older.meetings[0].executiveSummary
      };
    }`;

    const res = await runtime.execute({ code, intent: "Create and query meeting in sandbox" });
    expect(res.status).toBe("completed");
    const result = res.result as any;
    expect(result.totalFound).toBe(1);
    expect(result.summaryDecision).toContain("Durable Code Mode");
  });

  it("verifies delete_meeting requiresApproval in connector policy", () => {
    const mockEnv: any = {};
    const conn = new MeetingNotesConnector(null, mockEnv);
    const tools = conn.getToolMap();

    expect(tools.delete_meeting.requiresApproval).toBe(true);
    expect(tools.create_meeting.requiresApproval).toBe(false);
    expect(tools.list_meetings.requiresApproval).toBe(false);
  });

  it("pauses execution for approval when delete_meeting is invoked in sandbox", async () => {
    const mockEnv: any = {};
    const mockSession: SessionState = { sessionId: "cm-pause-del", mountedServers: {} };
    const runtime = createSpikeCodemodeRuntime(null, mockEnv, mockSession);

    // 1. Create a meeting first
    const createRes = await runtime.execute({
      code: `async () => {
        return await meetings.create_meeting({
          title: "Sensitive Board Sync",
          meetingDate: "2026-10-22"
        });
      }`
    });
    expect(createRes.status).toBe("completed");
    const meetingId = (createRes.result as any).meetingId;

    // 2. Attempt to delete in sandbox -> should pause for human approval
    const deleteRes = await runtime.execute({
      code: `async () => {
        return await meetings.delete_meeting({ meetingId: "${meetingId}" });
      }`
    });

    expect(deleteRes.status).toBe("paused");
    if (deleteRes.status === "paused") {
      expect(deleteRes.pending.length).toBe(1);
      expect(deleteRes.pending[0].connector).toBe("meetings");
      expect(deleteRes.pending[0].method).toBe("delete_meeting");
    }

    // Approve the deletion
    const resumeRes = await runtime.approve({
      executionId: deleteRes.executionId,
    });
    expect(resumeRes.status).toBe("completed");

    const checkList = await runtime.execute({
      code: `async () => { return await meetings.list_meetings(); }`
    });
    expect((checkList.result as any).total).toBe(0);
  });

  it("supports rollback on created meetings via codemode runtime", async () => {
    const mockEnv: any = {};
    const mockSession: SessionState = { sessionId: "cm-rollback", mountedServers: {} };
    const runtime = createSpikeCodemodeRuntime(null, mockEnv, mockSession);

    const createRes = await runtime.execute({
      code: `async () => {
        return await meetings.create_meeting({
          title: "Temporary Working Session",
          meetingDate: "2026-10-22"
        });
      }`
    });
    expect(createRes.status).toBe("completed");
    const meetingId = (createRes.result as any).meetingId;

    // Verify it exists
    const check1 = await runtime.execute({
      code: `async () => { return await meetings.get_meeting({ meetingId: "${meetingId}" }); }`
    });
    expect((check1.result as any).id).toBe(meetingId);

    // Rollback execution
    await runtime.rollback({ executionId: createRes.executionId });

    // Verify it was cleaned up
    const check2 = await runtime.execute({
      code: `async () => { return await meetings.get_meeting({ meetingId: "${meetingId}" }); }`
    });
    expect((check2.result as any).error).toBeDefined();
  });
});

describe("Meeting Notes Extended Features: Updates, Transcript Paging & KV Sync", () => {
  beforeEach(() => {
    resetInMemoryMeetingStore();
  });

  it("updates meeting metadata via update_meeting", async () => {
    const store = new MeetingNotesStore();
    const created = await store.saveMeeting({
      id: "mtg_update_test",
      title: "Draft Sync",
      meetingDate: "2026-10-22",
      status: "scheduled",
      participants: ["Alice"],
      tags: ["draft"],
      transcriptText: "",
      transcriptSegments: [],
      questions: [],
      actionItems: [],
      createdAt: 100,
      updatedAt: 100,
    });

    const updated = await store.updateMeeting("mtg_update_test", {
      title: "Final Architecture Sync",
      status: "completed",
      participants: ["Alice", "Bob", "Zoltan"],
      tags: ["architecture", "final"],
      notesMarkdown: "# Notes\nFinalized design.",
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Final Architecture Sync");
    expect(updated?.status).toBe("completed");
    expect(updated?.participants.length).toBe(3);
    expect(updated?.notesMarkdown).toContain("Finalized design.");
  });

  it("retrieves paginated and sliced transcripts via get_transcript", async () => {
    const store = new MeetingNotesStore();
    const longText = "Alice: Line 1.\nBob: Line 2.\nCharlie: Line 3.\nAlice: Line 4.";
    await store.saveMeeting({
      id: "mtg_transcript_page",
      title: "Long Transcript Meeting",
      meetingDate: "2026-10-22",
      status: "completed",
      participants: ["Alice", "Bob", "Charlie"],
      tags: [],
      transcriptText: longText,
      transcriptSegments: parseTranscriptSegments(longText),
      questions: [],
      actionItems: [],
      createdAt: 100,
      updatedAt: 100,
    });

    const full = await store.getTranscript("mtg_transcript_page");
    expect("error" in full).toBe(false);
    if (!("error" in full)) {
      expect(full.totalLength).toBe(longText.length);
      expect(full.isTruncated).toBe(false);
      expect(full.transcriptSegments?.length).toBe(4);
    }

    // Slice with maxChars
    const sliced = await store.getTranscript("mtg_transcript_page", {
      offset: 0,
      maxChars: 15,
      format: "text",
    });
    expect("error" in sliced).toBe(false);
    if (!("error" in sliced)) {
      expect(sliced.transcriptText).toBe(longText.slice(0, 15));
      expect(sliced.isTruncated).toBe(true);
      expect(sliced.transcriptSegments).toBeUndefined();
    }
  });

  it("disambiguates meetings with same title using meetingDate", async () => {
    const store = new MeetingNotesStore();
    await store.saveMeeting({
      id: "mtg_standup_oct20",
      title: "Daily Standup",
      meetingDate: "2026-10-20",
      status: "completed",
      participants: [],
      tags: [],
      transcriptText: "",
      transcriptSegments: [],
      questions: [],
      actionItems: [],
      createdAt: 100,
      updatedAt: 100,
    });

    await store.saveMeeting({
      id: "mtg_standup_oct22",
      title: "Daily Standup",
      meetingDate: "2026-10-22",
      status: "completed",
      participants: [],
      tags: [],
      transcriptText: "",
      transcriptSegments: [],
      questions: [],
      actionItems: [],
      createdAt: 200,
      updatedAt: 200,
    });

    const m20 = await store.getMeeting("daily standup", "2026-10-20");
    expect(m20?.id).toBe("mtg_standup_oct20");

    const m22 = await store.getMeeting("daily standup", "2026-10-22");
    expect(m22?.id).toBe("mtg_standup_oct22");
  });

  it("mirrors records and chronological index to SESSION_KV", async () => {
    const kvStore = new Map<string, string>();
    const mockKv: any = {
      get: async (key: string, format?: string) => {
        const val = kvStore.get(key);
        if (!val) return null;
        return format === "json" ? JSON.parse(val) : val;
      },
      put: async (key: string, val: string) => {
        kvStore.set(key, val);
      },
      delete: async (key: string) => {
        kvStore.delete(key);
      },
    };

    const env: Env = {
      SESSION_KV: mockKv,
    };

    const store = new MeetingNotesStore(null, env);
    const m = await store.saveMeeting({
      id: "mtg_kv_test",
      title: "KV Synced Meeting",
      meetingDate: "2026-10-22",
      status: "completed",
      participants: ["Zoltan"],
      tags: ["kv"],
      transcriptText: "KV sync test transcript.",
      transcriptSegments: [],
      questions: [
        {
          id: "q_1",
          meetingId: "mtg_kv_test",
          question: "Is index saved?",
          status: "open",
          createdAt: 100,
          updatedAt: 100,
        },
      ],
      actionItems: [],
      createdAt: 100,
      updatedAt: 100,
    });

    // Check individual record in KV
    expect(kvStore.has(`meetings:record:${m.id}`)).toBe(true);

    // Check index array in KV
    expect(kvStore.has("meetings:index")).toBe(true);
    const indexData = JSON.parse(kvStore.get("meetings:index")!);
    expect(Array.isArray(indexData)).toBe(true);
    expect(indexData[0].id).toBe("mtg_kv_test");
    expect(indexData[0].hasTranscript).toBe(true);
    expect(indexData[0].openQuestionCount).toBe(1);

    // Delete and check KV cleanup
    await store.deleteMeeting(m.id);
    expect(kvStore.has(`meetings:record:${m.id}`)).toBe(false);
    const updatedIndex = JSON.parse(kvStore.get("meetings:index")!);
    expect(updatedIndex.length).toBe(0);
  });
});
