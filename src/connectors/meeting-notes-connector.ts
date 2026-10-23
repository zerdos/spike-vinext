import { CodemodeConnector, ConnectorTools, ConnectorTool } from "@cloudflare/codemode";
import { Env } from "../types.js";
import {
  MeetingNotesStore,
  getMeetingNotesStore,
  MeetingNoteRecord,
  normalizeMeetingDate,
  parseTranscriptSegments,
  generateMeetingId,
  TranscriptSegment,
  MeetingQuestion,
  MeetingActionItem,
} from "../../lib/meeting-notes.js";

export interface MeetingNotesConnectorOptions {
  store?: MeetingNotesStore;
  handlers?: Record<string, (args: any) => Promise<any> | any>;
  revertHandler?: (
    toolName: string,
    args: unknown,
    result: unknown,
    ctx?: any
  ) => Promise<void> | void;
}

export class MeetingNotesConnector extends CodemodeConnector {
  private store: MeetingNotesStore;
  private customHandlers?: Record<string, (args: any) => Promise<any> | any>;
  private revertHandler?: (
    toolName: string,
    args: unknown,
    result: unknown,
    ctx?: any
  ) => Promise<void> | void;

  constructor(ctx: any, env: Env, options?: MeetingNotesConnectorOptions) {
    super(ctx, env);
    this.store = options?.store || getMeetingNotesStore(ctx, env);
    this.customHandlers = options?.handlers;
    this.revertHandler = options?.revertHandler;
  }

  name(): string {
    return "meetings";
  }

  protected instructions(): string {
    return "Meeting Notes & Knowledge Base: create meetings with dates, attach transcripts, record summaries and key decisions, log and answer questions, track action items, and search or browse older meeting notes.";
  }

  public getToolMap(): ConnectorTools {
    return this.tools();
  }

  protected tools(): ConnectorTools {
    const tools: ConnectorTools = {};

    // 1. create_meeting
    tools.create_meeting = {
      description: "Create a new meeting record with a date, title, optional attendees, tags, transcript, summary, or questions.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title or subject of the meeting" },
          meetingDate: {
            type: "string",
            description: "Meeting date in 'YYYY-MM-DD' format or natural string (e.g. '2026-10-22', 'today', 'yesterday')",
          },
          startTime: { type: "string", description: "Optional start time (e.g. '14:00 UTC')" },
          endTime: { type: "string", description: "Optional end time" },
          status: {
            type: "string",
            enum: ["scheduled", "in_progress", "completed", "archived"],
            default: "completed",
          },
          participants: {
            type: "array",
            items: { type: "string" },
            description: "Attendee names or emails",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Topic or category tags (e.g. ['architecture', 'roadmap'])",
          },
          locationOrUrl: { type: "string", description: "Meeting link or room" },
          transcript: { type: "string", description: "Initial raw transcript text" },
          summary: {
            type: "object",
            properties: {
              executiveSummary: { type: "string" },
              keyDecisions: { type: "array", items: { type: "string" } },
              takeaways: { type: "array", items: { type: "string" } },
              topics: { type: "array", items: { type: "string" } },
            },
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                askedBy: { type: "string" },
                answeredBy: { type: "string" },
                answer: { type: "string" },
                status: { type: "string", enum: ["open", "answered", "deferred"] },
              },
              required: ["question"],
            },
          },
          actionItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                owner: { type: "string" },
                dueDate: { type: "string" },
                status: { type: "string", enum: ["pending", "in_progress", "done", "cancelled"] },
              },
              required: ["task"],
            },
          },
          notesMarkdown: { type: "string", description: "Additional freeform markdown notes" },
        },
        required: ["title"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["create_meeting"]) {
          return await this.customHandlers["create_meeting"](args);
        }

        const date = normalizeMeetingDate(args.meetingDate);
        const id = generateMeetingId(date);
        const now = Date.now();

        const transcript = args.transcript || "";
        const segments: TranscriptSegment[] = transcript
          ? parseTranscriptSegments(transcript)
          : [];

        const questions: MeetingQuestion[] = (args.questions || []).map(
          (q: any, idx: number) => ({
            id: `q_${idx + 1}`,
            meetingId: id,
            question: q.question,
            askedBy: q.askedBy,
            answeredBy: q.answeredBy,
            answer: q.answer,
            status: q.status || (q.answer ? "answered" : "open"),
            tags: q.tags || [],
            createdAt: now,
            updatedAt: now,
          })
        );

        const actionItems: MeetingActionItem[] = (args.actionItems || []).map(
          (a: any, idx: number) => ({
            id: `ai_${idx + 1}`,
            meetingId: id,
            task: a.task,
            owner: a.owner,
            dueDate: a.dueDate,
            status: a.status || "pending",
            createdAt: now,
            updatedAt: now,
          })
        );

        const record: MeetingNoteRecord = {
          id,
          title: args.title.trim(),
          meetingDate: date,
          startTime: args.startTime,
          endTime: args.endTime,
          status: args.status || "completed",
          participants: args.participants || [],
          tags: args.tags || [],
          locationOrUrl: args.locationOrUrl,
          summary: args.summary
            ? {
                executiveSummary: args.summary.executiveSummary || "",
                keyDecisions: args.summary.keyDecisions || [],
                takeaways: args.summary.takeaways || [],
                topics: args.summary.topics || [],
                updatedAt: now,
              }
            : undefined,
          transcriptText: transcript,
          transcriptSegments: segments,
          questions,
          actionItems,
          notesMarkdown: args.notesMarkdown,
          createdAt: now,
          updatedAt: now,
        };

        const saved = await this.store.saveMeeting(record);
        return {
          status: "created",
          meetingId: saved.id,
          meetingDate: saved.meetingDate,
          title: saved.title,
          participants: saved.participants,
          hasSummary: Boolean(saved.summary),
          questionCount: saved.questions.length,
          actionItemCount: saved.actionItems.length,
          meeting: saved,
        };
      },
      revert: async (args: any, result: any, ctx?: any) => {
        if (result?.meetingId) {
          await this.store.deleteMeeting(result.meetingId);
        }
        if (this.revertHandler) {
          await this.revertHandler("create_meeting", args, result, ctx);
        }
      },
    };

    // 2. get_meeting
    tools.get_meeting = {
      description: "Retrieve complete meeting notes by meetingId or title (with optional meetingDate), including transcript, summary, and questions.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string", description: "Meeting ID or title" },
          meetingDate: { type: "string", description: "Optional date filter when looking up by title (YYYY-MM-DD)" },
          includeTranscript: { type: "boolean", default: true },
          transcriptMaxChars: { type: "number", default: 16000 },
        },
        required: ["meetingId"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["get_meeting"]) {
          return await this.customHandlers["get_meeting"](args);
        }
        const meeting = await this.store.getMeeting(args.meetingId, args.meetingDate);
        if (!meeting) {
          return { error: `Meeting '${args.meetingId}' not found.` };
        }

        const res: any = { ...meeting };
        if (args.includeTranscript === false) {
          delete res.transcriptText;
          delete res.transcriptSegments;
        } else if (
          typeof args.transcriptMaxChars === "number" &&
          res.transcriptText &&
          res.transcriptText.length > args.transcriptMaxChars
        ) {
          res.transcriptTruncated = true;
          res.transcriptText = res.transcriptText.slice(0, args.transcriptMaxChars) + "... [truncated]";
        }
        return res;
      },
    };

    // 3. update_meeting
    tools.update_meeting = {
      description: "Update meeting metadata (title, date, times, status, attendees, tags, room/link, notes).",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string", description: "Target meeting ID" },
          title: { type: "string" },
          meetingDate: { type: "string", description: "Meeting date in 'YYYY-MM-DD' or natural format" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          status: { type: "string", enum: ["scheduled", "in_progress", "completed", "archived"] },
          participants: { type: "array", items: { type: "string" } },
          tags: { type: "array", items: { type: "string" } },
          locationOrUrl: { type: "string" },
          notesMarkdown: { type: "string" },
        },
        required: ["meetingId"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["update_meeting"]) {
          return await this.customHandlers["update_meeting"](args);
        }
        const updated = await this.store.updateMeeting(args.meetingId, {
          title: args.title,
          meetingDate: args.meetingDate,
          startTime: args.startTime,
          endTime: args.endTime,
          status: args.status,
          participants: args.participants,
          tags: args.tags,
          locationOrUrl: args.locationOrUrl,
          notesMarkdown: args.notesMarkdown,
        });

        if (!updated) {
          return { error: `Meeting '${args.meetingId}' not found.` };
        }

        return {
          status: "updated",
          meetingId: updated.id,
          title: updated.title,
          meetingDate: updated.meetingDate,
          meeting: updated,
        };
      },
      revert: async (args: any, result: any, ctx?: any) => {
        if (this.revertHandler) {
          await this.revertHandler("update_meeting", args, result, ctx);
        }
      },
    };

    // 3. list_meetings
    tools.list_meetings = {
      description: "Browse or filter older meetings chronologically by date range, participant, tag, or status.",
      inputSchema: {
        type: "object",
        properties: {
          dateFrom: { type: "string", description: "Start date (YYYY-MM-DD)" },
          dateTo: { type: "string", description: "End date (YYYY-MM-DD)" },
          onDate: { type: "string", description: "Exact date (YYYY-MM-DD)" },
          participant: { type: "string", description: "Filter by attendee name" },
          tag: { type: "string", description: "Filter by tag" },
          status: { type: "string", enum: ["scheduled", "in_progress", "completed", "archived"] },
          limit: { type: "number", default: 20 },
          offset: { type: "number", default: 0 },
        },
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["list_meetings"]) {
          return await this.customHandlers["list_meetings"](args);
        }
        return await this.store.listMeetings(args);
      },
    };

    // 4. search_meetings
    tools.search_meetings = {
      description: "Full-text search across all past meetings, transcripts, summaries, decisions, and questions.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keyword or phrase" },
          dateFrom: { type: "string" },
          dateTo: { type: "string" },
          participant: { type: "string" },
          tag: { type: "string" },
        },
        required: ["query"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["search_meetings"]) {
          return await this.customHandlers["search_meetings"](args);
        }
        return await this.store.searchMeetings(args.query, args);
      },
    };

    // 5. add_transcript
    tools.add_transcript = {
      description: "Append or replace transcript text and speaker turns on an existing meeting.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string", description: "Meeting ID or title" },
          transcript: { type: "string", description: "Transcript text to add" },
          mode: { type: "string", enum: ["append", "replace"], default: "append" },
        },
        required: ["meetingId", "transcript"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["add_transcript"]) {
          return await this.customHandlers["add_transcript"](args);
        }
        const meeting = await this.store.getMeeting(args.meetingId);
        if (!meeting) {
          return { error: `Meeting '${args.meetingId}' not found.` };
        }

        const newText = String(args.transcript || "");
        const newSegments = parseTranscriptSegments(newText);

        if (args.mode === "replace") {
          meeting.transcriptText = newText;
          meeting.transcriptSegments = newSegments;
        } else {
          meeting.transcriptText = meeting.transcriptText
            ? `${meeting.transcriptText}\n${newText}`
            : newText;
          meeting.transcriptSegments = [
            ...(meeting.transcriptSegments || []),
            ...newSegments,
          ];
        }

        await this.store.saveMeeting(meeting);
        return {
          status: "updated",
          meetingId: meeting.id,
          totalTranscriptLength: meeting.transcriptText.length,
          segmentCount: meeting.transcriptSegments.length,
        };
      },
      revert: async (args: any, result: any, ctx?: any) => {
        if (this.revertHandler) {
          await this.revertHandler("add_transcript", args, result, ctx);
        }
      },
    };

    // 6. get_transcript
    tools.get_transcript = {
      description: "Retrieve raw transcript text and/or speaker segments with optional character offset and pagination.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string", description: "Meeting ID or title" },
          offset: { type: "number", description: "Character offset into transcript text", default: 0 },
          maxChars: { type: "number", description: "Maximum characters to return", default: 16000 },
          format: { type: "string", enum: ["text", "segments", "both"], default: "both" },
        },
        required: ["meetingId"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["get_transcript"]) {
          return await this.customHandlers["get_transcript"](args);
        }
        return await this.store.getTranscript(args.meetingId, args);
      },
    };

    // 7. save_summary
    tools.save_summary = {
      description: "Save or update structured summary, key decisions, takeaways, and topics for a meeting.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string", description: "Meeting ID or title" },
          executiveSummary: { type: "string", description: "Executive TL;DR summary" },
          keyDecisions: { type: "array", items: { type: "string" }, description: "Decisions made" },
          takeaways: { type: "array", items: { type: "string" }, description: "Key takeaways" },
          topics: { type: "array", items: { type: "string" }, description: "Topics covered" },
          notesMarkdown: { type: "string", description: "Optional markdown notes" },
          mergeArrays: { type: "boolean", default: false },
        },
        required: ["meetingId", "executiveSummary"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["save_summary"]) {
          return await this.customHandlers["save_summary"](args);
        }
        const meeting = await this.store.getMeeting(args.meetingId);
        if (!meeting) {
          return { error: `Meeting '${args.meetingId}' not found.` };
        }

        const existingSummary = meeting.summary;
        const now = Date.now();

        if (args.mergeArrays && existingSummary) {
          meeting.summary = {
            executiveSummary: args.executiveSummary,
            keyDecisions: [
              ...existingSummary.keyDecisions,
              ...(args.keyDecisions || []),
            ],
            takeaways: [
              ...existingSummary.takeaways,
              ...(args.takeaways || []),
            ],
            topics: [
              ...existingSummary.topics,
              ...(args.topics || []),
            ],
            updatedAt: now,
          };
        } else {
          meeting.summary = {
            executiveSummary: args.executiveSummary,
            keyDecisions: args.keyDecisions || [],
            takeaways: args.takeaways || [],
            topics: args.topics || [],
            updatedAt: now,
          };
        }

        if (args.notesMarkdown) {
          meeting.notesMarkdown = args.notesMarkdown;
        }

        await this.store.saveMeeting(meeting);
        return {
          status: "updated",
          meetingId: meeting.id,
          summary: meeting.summary,
        };
      },
      revert: async (args: any, result: any, ctx?: any) => {
        if (this.revertHandler) {
          await this.revertHandler("save_summary", args, result, ctx);
        }
      },
    };

    // 8. add_questions
    tools.add_questions = {
      description: "Log open or answered questions raised in a meeting.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string", description: "Meeting ID or title" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                askedBy: { type: "string" },
                answeredBy: { type: "string" },
                answer: { type: "string" },
                status: { type: "string", enum: ["open", "answered", "deferred"] },
              },
              required: ["question"],
            },
          },
        },
        required: ["meetingId", "questions"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["add_questions"]) {
          return await this.customHandlers["add_questions"](args);
        }
        const meeting = await this.store.getMeeting(args.meetingId);
        if (!meeting) {
          return { error: `Meeting '${args.meetingId}' not found.` };
        }

        const now = Date.now();
        const startIdx = meeting.questions.length;
        const added: MeetingQuestion[] = args.questions.map((q: any, idx: number) => ({
          id: `q_${startIdx + idx + 1}`,
          meetingId: meeting.id,
          question: q.question,
          askedBy: q.askedBy,
          answeredBy: q.answeredBy,
          answer: q.answer,
          status: q.status || (q.answer ? "answered" : "open"),
          tags: q.tags || [],
          createdAt: now,
          updatedAt: now,
        }));

        meeting.questions.push(...added);
        await this.store.saveMeeting(meeting);

        return {
          status: "added",
          meetingId: meeting.id,
          totalQuestions: meeting.questions.length,
          addedQuestions: added,
        };
      },
      revert: async (args: any, result: any, ctx?: any) => {
        if (this.revertHandler) {
          await this.revertHandler("add_questions", args, result, ctx);
        }
      },
    };

    // 9. update_question
    tools.update_question = {
      description: "Answer, resolve, or update the status of a specific question.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string" },
          questionId: { type: "string" },
          answer: { type: "string" },
          answeredBy: { type: "string" },
          status: { type: "string", enum: ["open", "answered", "deferred"] },
        },
        required: ["meetingId", "questionId"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["update_question"]) {
          return await this.customHandlers["update_question"](args);
        }
        const meeting = await this.store.getMeeting(args.meetingId);
        if (!meeting) {
          return { error: `Meeting '${args.meetingId}' not found.` };
        }

        const q = meeting.questions.find(
          (item) =>
            item.id === args.questionId ||
            item.question.toLowerCase().includes(args.questionId.toLowerCase())
        );
        if (!q) {
          return { error: `Question '${args.questionId}' not found in meeting.` };
        }

        if (args.answer !== undefined) q.answer = args.answer;
        if (args.answeredBy !== undefined) q.answeredBy = args.answeredBy;
        if (args.status !== undefined) {
          q.status = args.status;
        } else if (args.answer) {
          q.status = "answered";
        }
        q.updatedAt = Date.now();

        await this.store.saveMeeting(meeting);
        return { status: "updated", question: q };
      },
      revert: async (args: any, result: any, ctx?: any) => {
        if (this.revertHandler) {
          await this.revertHandler("update_question", args, result, ctx);
        }
      },
    };

    // 10. list_questions
    tools.list_questions = {
      description: "List questions across all meetings or filtered by meetingId, status ('open' | 'answered'), or person.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string" },
          status: { type: "string", enum: ["open", "answered", "deferred"] },
          askedBy: { type: "string" },
          dateFrom: { type: "string" },
          dateTo: { type: "string" },
        },
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["list_questions"]) {
          return await this.customHandlers["list_questions"](args);
        }
        return await this.store.listQuestions(args);
      },
    };

    // 11. add_action_items
    tools.add_action_items = {
      description: "Add follow-up action items and task assignments to a meeting.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string" },
          actionItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                owner: { type: "string" },
                dueDate: { type: "string" },
                status: { type: "string", enum: ["pending", "in_progress", "done", "cancelled"] },
              },
              required: ["task"],
            },
          },
        },
        required: ["meetingId", "actionItems"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["add_action_items"]) {
          return await this.customHandlers["add_action_items"](args);
        }
        const meeting = await this.store.getMeeting(args.meetingId);
        if (!meeting) {
          return { error: `Meeting '${args.meetingId}' not found.` };
        }

        const now = Date.now();
        const startIdx = meeting.actionItems.length;
        const added: MeetingActionItem[] = args.actionItems.map((a: any, idx: number) => ({
          id: `ai_${startIdx + idx + 1}`,
          meetingId: meeting.id,
          task: a.task,
          owner: a.owner,
          dueDate: a.dueDate,
          status: a.status || "pending",
          createdAt: now,
          updatedAt: now,
        }));

        meeting.actionItems.push(...added);
        await this.store.saveMeeting(meeting);

        return {
          status: "added",
          meetingId: meeting.id,
          totalActionItems: meeting.actionItems.length,
          addedActionItems: added,
        };
      },
      revert: async (args: any, result: any, ctx?: any) => {
        if (this.revertHandler) {
          await this.revertHandler("add_action_items", args, result, ctx);
        }
      },
    };

    // 12. update_action_item
    tools.update_action_item = {
      description: "Update status, owner, or due date for a meeting action item.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string" },
          actionItemId: { type: "string" },
          status: { type: "string", enum: ["pending", "in_progress", "done", "cancelled"] },
          owner: { type: "string" },
          dueDate: { type: "string" },
          task: { type: "string" },
        },
        required: ["meetingId", "actionItemId"],
      },
      requiresApproval: false,
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["update_action_item"]) {
          return await this.customHandlers["update_action_item"](args);
        }
        const meeting = await this.store.getMeeting(args.meetingId);
        if (!meeting) {
          return { error: `Meeting '${args.meetingId}' not found.` };
        }

        const a = meeting.actionItems.find((item) => item.id === args.actionItemId);
        if (!a) {
          return { error: `Action item '${args.actionItemId}' not found.` };
        }

        if (args.status !== undefined) a.status = args.status;
        if (args.owner !== undefined) a.owner = args.owner;
        if (args.dueDate !== undefined) a.dueDate = args.dueDate;
        if (args.task !== undefined) a.task = args.task;
        a.updatedAt = Date.now();

        await this.store.saveMeeting(meeting);
        return { status: "updated", actionItem: a };
      },
      revert: async (args: any, result: any, ctx?: any) => {
        if (this.revertHandler) {
          await this.revertHandler("update_action_item", args, result, ctx);
        }
      },
    };

    // 13. delete_meeting (requiresApproval: true)
    tools.delete_meeting = {
      description: "Delete a meeting record and its associated transcripts, summaries, and questions.",
      inputSchema: {
        type: "object",
        properties: {
          meetingId: { type: "string", description: "Meeting ID to delete" },
        },
        required: ["meetingId"],
      },
      requiresApproval: true, // Sensitive operation requiring human-in-the-loop approval
      replay: "log",
      execute: async (args: any) => {
        if (this.customHandlers?.["delete_meeting"]) {
          return await this.customHandlers["delete_meeting"](args);
        }
        const success = await this.store.deleteMeeting(args.meetingId);
        return { status: "deleted", success, meetingId: args.meetingId };
      },
      revert: async (args: any, result: any, ctx?: any) => {
        if (this.revertHandler) {
          await this.revertHandler("delete_meeting", args, result, ctx);
        }
      },
    };

    return tools;
  }
}
