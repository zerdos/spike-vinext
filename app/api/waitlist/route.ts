import {
  WaitlistSubmission,
  getWaitlistStats,
  getWaitlistEntryByEmail,
  getNextWaitlistPosition,
  saveWaitlistEntry,
} from "@/lib/waitlist-db";

export type { WaitlistSubmission };

function generateReferralCode(email: string, position: number): string {
  const hash = Math.abs(
    email.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  )
    .toString(36)
    .toUpperCase()
    .slice(0, 4);
  return `SPK-${position}-${hash || "EDGE"}`;
}

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET() {
  const stats = await getWaitlistStats();
  return Response.json(stats, { headers: getCorsHeaders() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, company, client, useCase, githubUsername } = (body || {}) as {
      email?: string;
      name?: string;
      company?: string;
      client?: string;
      useCase?: string;
      githubUsername?: string;
    };

    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      return Response.json(
        {
          error: "A valid email address is required to join the waiting list.",
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if already in waitlist (checks D1 database)
    const existing = await getWaitlistEntryByEmail(normalizedEmail);
    if (existing) {
      return Response.json(
        {
          success: true,
          alreadyRegistered: true,
          message: "You are already on the Spike Land waiting list!",
          ticket: {
            position: existing.position,
            referralCode: existing.referralCode,
            email: existing.email,
            createdAt: existing.createdAt,
          },
        },
        { status: 200, headers: getCorsHeaders() }
      );
    }

    const newPosition = await getNextWaitlistPosition();
    const referralCode = generateReferralCode(normalizedEmail, newPosition);

    const newEntry: WaitlistSubmission = {
      id: `wlt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: normalizedEmail,
      name: name?.trim(),
      company: company?.trim(),
      client: client?.trim(),
      useCase: useCase?.trim(),
      githubUsername: githubUsername?.trim(),
      referralCode,
      position: newPosition,
      createdAt: new Date().toISOString(),
    };

    await saveWaitlistEntry(newEntry);

    return Response.json(
      {
        success: true,
        message: "You have been added to the Spike Land waiting list!",
        ticket: {
          position: newEntry.position,
          referralCode: newEntry.referralCode,
          email: newEntry.email,
          name: newEntry.name,
          createdAt: newEntry.createdAt,
        },
      },
      { status: 201, headers: getCorsHeaders() }
    );
  } catch {
    return Response.json(
      {
        error: "Failed to process waiting list request. Please check your payload.",
      },
      { status: 400, headers: getCorsHeaders() }
    );
  }
}

