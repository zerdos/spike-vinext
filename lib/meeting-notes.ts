/**
 * Meeting Notes Engine: Storage, Date Normalization & Search
 * PRD: prds/meetingNotes.md
 */

import {
  Env,
  MeetingStatus,
  QuestionStatus,
  ActionItemStatus,
  TranscriptSegment,
  MeetingSummary,
  MeetingQuestion,
  MeetingActionItem,
  MeetingNoteRecord,
  MeetingIndexItem,
  MeetingSummaryPreview,
} from "../src/types.js";

export type {
  MeetingStatus,
  QuestionStatus,
  ActionItemStatus,
  TranscriptSegment,
  MeetingSummary,
  MeetingQuestion,
  MeetingActionItem,
  MeetingNoteRecord,
  MeetingIndexItem,
  MeetingSummaryPreview,
};

/**
 * Normalizes input date strings (e.g. "2026-10-22", "today", "yesterday", ISO strings)
 * into a strict YYYY-MM-DD format.
 */
export function normalizeMeetingDate(input?: string): string {
  if (!input || typeof input !== "string" || !input.trim()) {
    return new Date().toISOString().slice(0, 10);
  }
  const trimmed = input.trim().toLowerCase();

  const now = new Date();
  if (trimmed === "today") {
    return now.toISOString().slice(0, 10);
  }
  if (trimmed === "yesterday") {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return yesterday.toISOString().slice(0, 10);
  }
  if (trimmed === "tomorrow") {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  }

  // If already YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }

  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return now.toISOString().slice(0, 10);
}

/**
 * Parses raw text transcript into structured speaker segments if formatted with:
 * [Speaker 00:01:23]: text OR Speaker: text
 */
export function parseTranscriptSegments(rawText: string): TranscriptSegment[] {
  if (!rawText || typeof rawText !== "string") return [];
  const lines = rawText.split("\n");
  const segments: TranscriptSegment[] = [];

  const bracketPattern = /^\s*\[([^\]\d]+)?\s*(\d{1,2}:\d{2}(?::\d{2})?)?\]:\s*(.+)$/i;
  const colonPattern = /^\s*([A-Za-z0-9_\s]{2,30}):\s*(.+)$/;

  let currentSpeaker: string | undefined;
  let currentTimestamp: string | undefined;
  let currentBuffer: string[] = [];

  function flush() {
    if (currentBuffer.length > 0) {
      const text = currentBuffer.join(" ").trim();
      if (text) {
        segments.push({
          id: `seg_${segments.length + 1}`,
          speaker: currentSpeaker,
          timestamp: currentTimestamp,
          text,
          createdAt: Date.now(),
        });
      }
      currentBuffer = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bMatch = trimmed.match(bracketPattern);
    if (bMatch) {
      flush();
      currentSpeaker = bMatch[1]?.trim() || undefined;
      currentTimestamp = bMatch[2]?.trim() || undefined;
      currentBuffer.push(bMatch[3].trim());
      continue;
    }

    const cMatch = trimmed.match(colonPattern);
    if (cMatch && !cMatch[1].toLowerCase().startsWith("http")) {
      flush();
      currentSpeaker = cMatch[1].trim();
      currentTimestamp = undefined;
      currentBuffer.push(cMatch[2].trim());
      continue;
    }

    currentBuffer.push(trimmed);
  }

  flush();

  if (segments.length === 0 && rawText.trim().length > 0) {
    segments.push({
      id: "seg_1",
      text: rawText.trim(),
      createdAt: Date.now(),
    });
  }

  return segments;
}

export function generateMeetingId(dateStr: string): string {
  const cleanDate = dateStr.replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `mtg_${cleanDate}_${randomSuffix}`;
}

// In-memory global store fallback when DO SQLite / KV is not passed
const inMemoryMeetingStore = new Map<string, MeetingNoteRecord>();

export function resetInMemoryMeetingStore(): void {
  inMemoryMeetingStore.clear();
}

/**
 * Core Meeting Notes Storage Manager
 */
export class MeetingNotesStore {
  private ctx?: any;
  private env?: Env;
  private memoryFallback: Map<string, MeetingNoteRecord>;

  constructor(ctx?: any, env?: Env) {
    this.ctx = ctx;
    this.env = env;
    this.memoryFallback = inMemoryMeetingStore;
    this.ensureTables();
  }

  private ensureTables(): void {
    if (this.ctx?.storage?.sql?.exec) {
      try {
        this.ctx.storage.sql.exec(`
          CREATE TABLE IF NOT EXISTS meetings (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            meeting_date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            status TEXT NOT NULL DEFAULT 'completed',
            participants_json TEXT NOT NULL DEFAULT '[]',
            tags_json TEXT NOT NULL DEFAULT '[]',
            location_or_url TEXT,
            summary_json TEXT,
            transcript_text TEXT NOT NULL DEFAULT '',
            transcript_segments_json TEXT NOT NULL DEFAULT '[]',
            notes_markdown TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_meetings_date
            ON meetings (meeting_date DESC, updated_at DESC);

          CREATE TABLE IF NOT EXISTS meeting_questions (
            id TEXT PRIMARY KEY,
            meeting_id TEXT NOT NULL,
            question TEXT NOT NULL,
            asked_by TEXT,
            answered_by TEXT,
            answer TEXT,
            status TEXT NOT NULL DEFAULT 'open',
            tags_json TEXT NOT NULL DEFAULT '[]',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_meeting_questions_meeting
            ON meeting_questions (meeting_id, status);

          CREATE TABLE IF NOT EXISTS meeting_action_items (
            id TEXT PRIMARY KEY,
            meeting_id TEXT NOT NULL,
            task TEXT NOT NULL,
            owner TEXT,
            due_date TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting
            ON meeting_action_items (meeting_id, status);
        `);
      } catch {
        // Table setup failure fallback
      }
    }
  }

  async saveMeeting(meeting: MeetingNoteRecord): Promise<MeetingNoteRecord> {
    meeting.updatedAt = Date.now();
    this.memoryFallback.set(meeting.id, meeting);

    // Save to SQLite if storage available
    if (this.ctx?.storage?.sql?.exec) {
      try {
        this.ctx.storage.sql.exec(
          `INSERT OR REPLACE INTO meetings (
            id, title, meeting_date, start_time, end_time, status,
            participants_json, tags_json, location_or_url, summary_json,
            transcript_text, transcript_segments_json, notes_markdown,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          meeting.id,
          meeting.title,
          meeting.meetingDate,
          meeting.startTime || null,
          meeting.endTime || null,
          meeting.status,
          JSON.stringify(meeting.participants || []),
          JSON.stringify(meeting.tags || []),
          meeting.locationOrUrl || null,
          meeting.summary ? JSON.stringify(meeting.summary) : null,
          meeting.transcriptText || "",
          JSON.stringify(meeting.transcriptSegments || []),
          meeting.notesMarkdown || null,
          meeting.createdAt,
          meeting.updatedAt
        );

        // Sync questions table
        this.ctx.storage.sql.exec(
          `DELETE FROM meeting_questions WHERE meeting_id = ?`,
          meeting.id
        );
        for (const q of meeting.questions || []) {
          this.ctx.storage.sql.exec(
            `INSERT INTO meeting_questions (
              id, meeting_id, question, asked_by, answered_by, answer, status, tags_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            q.id,
            meeting.id,
            q.question,
            q.askedBy || null,
            q.answeredBy || null,
            q.answer || null,
            q.status || "open",
            JSON.stringify(q.tags || []),
            q.createdAt,
            q.updatedAt
          );
        }

        // Sync action items table
        this.ctx.storage.sql.exec(
          `DELETE FROM meeting_action_items WHERE meeting_id = ?`,
          meeting.id
        );
        for (const a of meeting.actionItems || []) {
          this.ctx.storage.sql.exec(
            `INSERT INTO meeting_action_items (
              id, meeting_id, task, owner, due_date, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            a.id,
            meeting.id,
            a.task,
            a.owner || null,
            a.dueDate || null,
            a.status || "pending",
            a.createdAt,
            a.updatedAt
          );
        }
      } catch {
        // Fallback to memory
      }
    }

    // Mirror to SESSION_KV if available
    if (this.env?.SESSION_KV) {
      try {
        await this.env.SESSION_KV.put(
          `meetings:record:${meeting.id}`,
          JSON.stringify(meeting)
        );

        // Update meetings:index
        let index: MeetingIndexItem[] = [];
        try {
          const raw = await this.env.SESSION_KV.get("meetings:index", "json");
          if (Array.isArray(raw)) {
            index = raw;
          }
        } catch {}

        const item: MeetingIndexItem = {
          id: meeting.id,
          title: meeting.title,
          meetingDate: meeting.meetingDate,
          startTime: meeting.startTime,
          status: meeting.status,
          participants: meeting.participants || [],
          tags: meeting.tags || [],
          hasTranscript: Boolean(meeting.transcriptText && meeting.transcriptText.length > 0),
          hasSummary: Boolean(meeting.summary),
          questionCount: (meeting.questions || []).length,
          openQuestionCount: (meeting.questions || []).filter((q) => q.status === "open").length,
          actionItemCount: (meeting.actionItems || []).length,
          updatedAt: meeting.updatedAt,
        };

        const existingIdx = index.findIndex((i) => i.id === meeting.id);
        if (existingIdx >= 0) {
          index[existingIdx] = item;
        } else {
          index.push(item);
        }

        // Sort descending by date, then updatedAt
        index.sort((a, b) => {
          if (b.meetingDate !== a.meetingDate) {
            return b.meetingDate.localeCompare(a.meetingDate);
          }
          return b.updatedAt - a.updatedAt;
        });

        await this.env.SESSION_KV.put("meetings:index", JSON.stringify(index));
      } catch {
        // Ignore KV error
      }
    }

    return meeting;
  }

  async updateMeeting(
    meetingId: string,
    updates: Partial<Omit<MeetingNoteRecord, "id" | "createdAt">>
  ): Promise<MeetingNoteRecord | null> {
    const existing = await this.getMeeting(meetingId);
    if (!existing) return null;

    if (updates.title !== undefined) existing.title = updates.title.trim();
    if (updates.meetingDate !== undefined) existing.meetingDate = normalizeMeetingDate(updates.meetingDate);
    if (updates.startTime !== undefined) existing.startTime = updates.startTime;
    if (updates.endTime !== undefined) existing.endTime = updates.endTime;
    if (updates.status !== undefined) existing.status = updates.status;
    if (updates.participants !== undefined) existing.participants = updates.participants;
    if (updates.tags !== undefined) existing.tags = updates.tags;
    if (updates.locationOrUrl !== undefined) existing.locationOrUrl = updates.locationOrUrl;
    if (updates.notesMarkdown !== undefined) existing.notesMarkdown = updates.notesMarkdown;
    if (updates.summary !== undefined) existing.summary = updates.summary;
    if (updates.transcriptText !== undefined) {
      existing.transcriptText = updates.transcriptText;
      existing.transcriptSegments = parseTranscriptSegments(updates.transcriptText);
    }

    return await this.saveMeeting(existing);
  }

  async getMeeting(idOrTitle: string, meetingDate?: string): Promise<MeetingNoteRecord | null> {
    if (!idOrTitle) return null;
    const normDate = meetingDate ? normalizeMeetingDate(meetingDate) : undefined;

    // Check direct ID match in memory
    const direct = this.memoryFallback.get(idOrTitle);
    if (direct) {
      if (!normDate || direct.meetingDate === normDate) {
        return direct;
      }
    }

    // Check by ID or title in SQLite
    if (this.ctx?.storage?.sql?.exec) {
      try {
        const sqlQuery = normDate
          ? `SELECT * FROM meetings WHERE (id = ? OR LOWER(title) = LOWER(?)) AND meeting_date = ? LIMIT 1`
          : `SELECT * FROM meetings WHERE id = ? OR LOWER(title) = LOWER(?) ORDER BY meeting_date DESC, updated_at DESC LIMIT 1`;
        const params = normDate ? [idOrTitle, idOrTitle, normDate] : [idOrTitle, idOrTitle];
        const rows = this.ctx.storage.sql.exec(sqlQuery, ...params).toArray();

        if (rows.length > 0) {
          const r = rows[0];
          const meeting: MeetingNoteRecord = {
            id: r.id,
            title: r.title,
            meetingDate: r.meeting_date,
            startTime: r.start_time || undefined,
            endTime: r.end_time || undefined,
            status: r.status,
            participants: JSON.parse(r.participants_json || "[]"),
            tags: JSON.parse(r.tags_json || "[]"),
            locationOrUrl: r.location_or_url || undefined,
            summary: r.summary_json ? JSON.parse(r.summary_json) : undefined,
            transcriptText: r.transcript_text || "",
            transcriptSegments: JSON.parse(r.transcript_segments_json || "[]"),
            questions: [],
            actionItems: [],
            notesMarkdown: r.notes_markdown || undefined,
            createdAt: Number(r.created_at),
            updatedAt: Number(r.updated_at),
          };

          // Fetch questions
          const qRows = this.ctx.storage.sql
            .exec(
              `SELECT * FROM meeting_questions WHERE meeting_id = ? ORDER BY created_at ASC`,
              meeting.id
            )
            .toArray();
          meeting.questions = qRows.map((q: any) => ({
            id: q.id,
            meetingId: q.meeting_id,
            question: q.question,
            askedBy: q.asked_by || undefined,
            answeredBy: q.answered_by || undefined,
            answer: q.answer || undefined,
            status: q.status,
            tags: JSON.parse(q.tags_json || "[]"),
            createdAt: Number(q.created_at),
            updatedAt: Number(q.updated_at),
          }));

          // Fetch action items
          const aRows = this.ctx.storage.sql
            .exec(
              `SELECT * FROM meeting_action_items WHERE meeting_id = ? ORDER BY created_at ASC`,
              meeting.id
            )
            .toArray();
          meeting.actionItems = aRows.map((a: any) => ({
            id: a.id,
            meetingId: a.meeting_id,
            task: a.task,
            owner: a.owner || undefined,
            dueDate: a.due_date || undefined,
            status: a.status,
            createdAt: Number(a.created_at),
            updatedAt: Number(a.updated_at),
          }));

          this.memoryFallback.set(meeting.id, meeting);
          return meeting;
        }
      } catch {
        // Fallback
      }
    }

    // Try finding by title in memory (respecting optional meetingDate)
    for (const m of this.memoryFallback.values()) {
      if (
        m.title.toLowerCase() === idOrTitle.toLowerCase() &&
        (!normDate || m.meetingDate === normDate)
      ) {
        return m;
      }
    }

    // Try KV
    if (this.env?.SESSION_KV) {
      try {
        const val = await this.env.SESSION_KV.get(`meetings:record:${idOrTitle}`, "json");
        if (val) {
          const parsed = val as MeetingNoteRecord;
          if (!normDate || parsed.meetingDate === normDate) {
            this.memoryFallback.set(parsed.id, parsed);
            return parsed;
          }
        }

        // Try looking up in meetings:index to match by title
        const index = await this.env.SESSION_KV.get("meetings:index", "json");
        if (Array.isArray(index)) {
          const matchedItem = index.find(
            (i: any) =>
              i.title?.toLowerCase() === idOrTitle.toLowerCase() &&
              (!normDate || i.meetingDate === normDate)
          );
          if (matchedItem) {
            const fullRec = await this.env.SESSION_KV.get(`meetings:record:${matchedItem.id}`, "json");
            if (fullRec) {
              const parsed = fullRec as MeetingNoteRecord;
              this.memoryFallback.set(parsed.id, parsed);
              return parsed;
            }
          }
        }
      } catch {}
    }

    return null;
  }

  async getTranscript(
    meetingId: string,
    options?: {
      offset?: number;
      maxChars?: number;
      format?: "text" | "segments" | "both";
    }
  ): Promise<{
    meetingId: string;
    title: string;
    meetingDate: string;
    transcriptText?: string;
    transcriptSegments?: TranscriptSegment[];
    totalLength: number;
    isTruncated: boolean;
  } | { error: string }> {
    const meeting = await this.getMeeting(meetingId);
    if (!meeting) {
      return { error: `Meeting '${meetingId}' not found.` };
    }

    const fullText = meeting.transcriptText || "";
    const totalLength = fullText.length;
    const offset = Math.max(0, options?.offset || 0);
    const maxChars = options?.maxChars || 16000;
    const format = options?.format || "both";

    const sliced = fullText.slice(offset, offset + maxChars);
    const isTruncated = offset + maxChars < totalLength;

    const res: any = {
      meetingId: meeting.id,
      title: meeting.title,
      meetingDate: meeting.meetingDate,
      totalLength,
      isTruncated,
    };

    if (format === "text" || format === "both") {
      res.transcriptText = sliced;
    }
    if (format === "segments" || format === "both") {
      res.transcriptSegments = meeting.transcriptSegments || [];
    }

    return res;
  }

  async listMeetings(filters?: {
    dateFrom?: string;
    dateTo?: string;
    onDate?: string;
    participant?: string;
    tag?: string;
    status?: MeetingStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; meetings: MeetingSummaryPreview[] }> {
    let all = Array.from(this.memoryFallback.values());

    // If SQLite has data, refresh or merge
    if (this.ctx?.storage?.sql?.exec) {
      try {
        const rows = this.ctx.storage.sql
          .exec(`SELECT id FROM meetings ORDER BY meeting_date DESC, updated_at DESC`)
          .toArray();
        for (const row of rows) {
          if (!this.memoryFallback.has(row.id)) {
            await this.getMeeting(row.id);
          }
        }
        all = Array.from(this.memoryFallback.values());
      } catch {}
    }

    // If memory and SQLite have no data, check SESSION_KV meetings:index
    if (all.length === 0 && this.env?.SESSION_KV) {
      try {
        const raw = await this.env.SESSION_KV.get("meetings:index", "json");
        if (Array.isArray(raw)) {
          for (const item of raw) {
            if (!this.memoryFallback.has(item.id)) {
              const rec = await this.env.SESSION_KV.get(`meetings:record:${item.id}`, "json");
              if (rec) {
                this.memoryFallback.set(item.id, rec as MeetingNoteRecord);
              }
            }
          }
          all = Array.from(this.memoryFallback.values());
        }
      } catch {}
    }

    // Filter
    let filtered = all.filter((m) => {
      if (filters?.onDate && m.meetingDate !== normalizeMeetingDate(filters.onDate)) {
        return false;
      }
      if (filters?.dateFrom && m.meetingDate < normalizeMeetingDate(filters.dateFrom)) {
        return false;
      }
      if (filters?.dateTo && m.meetingDate > normalizeMeetingDate(filters.dateTo)) {
        return false;
      }
      if (filters?.status && m.status !== filters.status) {
        return false;
      }
      if (filters?.participant) {
        const pLower = filters.participant.toLowerCase();
        const hasParticipant = m.participants.some((p) =>
          p.toLowerCase().includes(pLower)
        );
        if (!hasParticipant) return false;
      }
      if (filters?.tag) {
        const tLower = filters.tag.toLowerCase();
        const hasTag = m.tags.some((t) => t.toLowerCase().includes(tLower));
        if (!hasTag) return false;
      }
      return true;
    });

    // Sort descending by date, then updatedAt
    filtered.sort((a, b) => {
      if (b.meetingDate !== a.meetingDate) {
        return b.meetingDate.localeCompare(a.meetingDate);
      }
      return b.updatedAt - a.updatedAt;
    });

    const total = filtered.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 20;
    const paged = filtered.slice(offset, offset + limit);

    const summaries: MeetingSummaryPreview[] = paged.map((m) => ({
      id: m.id,
      title: m.title,
      meetingDate: m.meetingDate,
      startTime: m.startTime,
      status: m.status,
      participants: m.participants,
      tags: m.tags,
      executiveSummary: m.summary?.executiveSummary,
      transcriptLength: m.transcriptText ? m.transcriptText.length : 0,
      questionCount: m.questions.length,
      openQuestionCount: m.questions.filter((q) => q.status === "open").length,
      actionItemCount: m.actionItems.length,
      updatedAt: m.updatedAt,
    }));

    return { total, meetings: summaries };
  }

  async searchMeetings(
    query: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      participant?: string;
      tag?: string;
    }
  ): Promise<{
    query: string;
    total: number;
    results: Array<{
      meetingId: string;
      title: string;
      meetingDate: string;
      matchedFields: string[];
      executiveSummary?: string;
      transcriptSnippet?: string;
      matchedQuestions?: MeetingQuestion[];
      matchedActionItems?: MeetingActionItem[];
    }>;
  }> {
    const qLower = query.toLowerCase().trim();
    const { meetings } = await this.listMeetings(filters);
    const results: any[] = [];

    for (const summary of meetings) {
      const full = await this.getMeeting(summary.id);
      if (!full) continue;

      const matchedFields: string[] = [];
      let transcriptSnippet: string | undefined;

      if (full.title.toLowerCase().includes(qLower)) {
        matchedFields.push("title");
      }
      if (full.summary?.executiveSummary?.toLowerCase().includes(qLower)) {
        matchedFields.push("summary.executiveSummary");
      }
      if (full.summary?.keyDecisions?.some((d) => d.toLowerCase().includes(qLower))) {
        matchedFields.push("summary.keyDecisions");
      }
      if (full.summary?.takeaways?.some((t) => t.toLowerCase().includes(qLower))) {
        matchedFields.push("summary.takeaways");
      }
      if (full.notesMarkdown && full.notesMarkdown.toLowerCase().includes(qLower)) {
        matchedFields.push("notesMarkdown");
      }
      if (full.tags.some((t) => t.toLowerCase().includes(qLower))) {
        matchedFields.push("tags");
      }
      if (full.participants.some((p) => p.toLowerCase().includes(qLower))) {
        matchedFields.push("participants");
      }

      if (full.transcriptText && full.transcriptText.toLowerCase().includes(qLower)) {
        matchedFields.push("transcriptText");
        const idx = full.transcriptText.toLowerCase().indexOf(qLower);
        const start = Math.max(0, idx - 60);
        const end = Math.min(full.transcriptText.length, idx + qLower.length + 60);
        transcriptSnippet = "..." + full.transcriptText.slice(start, end).trim() + "...";
      }

      const matchedQuestions = full.questions.filter(
        (q) =>
          q.question.toLowerCase().includes(qLower) ||
          (q.answer && q.answer.toLowerCase().includes(qLower))
      );
      if (matchedQuestions.length > 0) {
        matchedFields.push("questions");
      }

      const matchedActionItems = full.actionItems.filter(
        (a) =>
          a.task.toLowerCase().includes(qLower) ||
          (a.owner && a.owner.toLowerCase().includes(qLower))
      );
      if (matchedActionItems.length > 0) {
        matchedFields.push("actionItems");
      }

      if (matchedFields.length > 0) {
        results.push({
          meetingId: full.id,
          title: full.title,
          meetingDate: full.meetingDate,
          matchedFields,
          executiveSummary: full.summary?.executiveSummary,
          transcriptSnippet,
          matchedQuestions: matchedQuestions.length > 0 ? matchedQuestions : undefined,
          matchedActionItems: matchedActionItems.length > 0 ? matchedActionItems : undefined,
        });
      }
    }

    return { query, total: results.length, results };
  }

  async listQuestions(filters?: {
    meetingId?: string;
    status?: QuestionStatus;
    askedBy?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ total: number; questions: MeetingQuestion[] }> {
    const { meetings } = await this.listMeetings({
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
      limit: 100,
    });

    const result: MeetingQuestion[] = [];
    for (const m of meetings) {
      if (filters?.meetingId && m.id !== filters.meetingId) continue;
      const full = await this.getMeeting(m.id);
      if (!full) continue;

      for (const q of full.questions) {
        if (filters?.status && q.status !== filters.status) continue;
        if (
          filters?.askedBy &&
          (!q.askedBy || !q.askedBy.toLowerCase().includes(filters.askedBy.toLowerCase()))
        ) {
          continue;
        }
        result.push(q);
      }
    }

    return { total: result.length, questions: result };
  }

  async deleteMeeting(meetingId: string): Promise<boolean> {
    const existed = this.memoryFallback.delete(meetingId);

    if (this.ctx?.storage?.sql?.exec) {
      try {
        this.ctx.storage.sql.exec(`DELETE FROM meeting_action_items WHERE meeting_id = ?`, meetingId);
        this.ctx.storage.sql.exec(`DELETE FROM meeting_questions WHERE meeting_id = ?`, meetingId);
        this.ctx.storage.sql.exec(`DELETE FROM meetings WHERE id = ?`, meetingId);
      } catch {}
    }

    if (this.env?.SESSION_KV) {
      try {
        await this.env.SESSION_KV.delete(`meetings:record:${meetingId}`);
        const raw = await this.env.SESSION_KV.get("meetings:index", "json");
        if (Array.isArray(raw)) {
          const updatedIndex = raw.filter((i: any) => i.id !== meetingId);
          await this.env.SESSION_KV.put("meetings:index", JSON.stringify(updatedIndex));
        }
      } catch {}
    }

    return existed;
  }
}

let defaultStoreInstance: MeetingNotesStore | null = null;

export function getMeetingNotesStore(ctx?: any, env?: Env): MeetingNotesStore {
  if (ctx || env) {
    return new MeetingNotesStore(ctx, env);
  }
  if (!defaultStoreInstance) {
    defaultStoreInstance = new MeetingNotesStore();
  }
  return defaultStoreInstance;
}
