import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const AUTOMATION_API = process.env.AUTOMATION_API_URL || "http://localhost:8000";

interface AutomationConversation {
  id: string;
  platform: string;
  listing_id?: string;
  listing_title?: string;
  buyer_name: string;
  last_message: string;
  last_activity: string;
  unread_count: number;
}

/** GET — List all conversations: merge Prisma DB + live platform messages */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (platform) where.platform = platform;
  if (status) where.status = status;

  // 1) Fetch local conversations from Prisma
  const localConversations = await prisma.conversation.findMany({
    where,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });

  const unreadCount = await prisma.conversation.count({ where: { unread: true } });

  // 2) Fetch live conversations from the automation backend
  let liveConversations: AutomationConversation[] = [];
  try {
    const platformFilter = platform ? `/${platform}/conversations` : "/inbox";
    const res = await fetch(
      `${AUTOMATION_API}/v2/messages${platformFilter}?user_id=default-user`,
      { signal: AbortSignal.timeout(10000), next: { revalidate: 30 } }
    );
    if (res.ok) {
      const data = await res.json();
      liveConversations = Array.isArray(data) ? data : [];
    }
  } catch {
    // Automation backend unavailable — just use local data
  }

  // 3) Merge: deduplicate by platform+buyer_name combo
  const seen = new Set(
    localConversations.map((c) => `${c.platform}:${c.buyerName}`)
  );

  const mergedLive = liveConversations
    .filter((c) => !seen.has(`${c.platform}:${c.buyer_name}`))
    .map((c) => ({
      id: `live-${c.platform}-${c.id}`,
      platform: c.platform,
      buyerName: c.buyer_name,
      buyerUsername: "",
      listingId: c.listing_id || null,
      listingTitle: c.listing_title || "",
      lastMessage: c.last_message,
      lastMessageAt: c.last_activity ? new Date(c.last_activity) : new Date(),
      unread: c.unread_count > 0,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      _source: "automation" as const,
    }));

  const allConversations = [
    ...localConversations.map((c) => ({ ...c, _source: "local" as const })),
    ...mergedLive,
  ].sort((a, b) => {
    const aTime = new Date(a.lastMessageAt).getTime();
    const bTime = new Date(b.lastMessageAt).getTime();
    return bTime - aTime;
  });

  return NextResponse.json({
    conversations: allConversations,
    unreadCount: unreadCount + liveConversations.filter((c) => c.unread_count > 0).length,
  });
}

/** POST — Create a new conversation (or add message to existing) */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { platform, buyerName, buyerUsername, listingId, listingTitle, message } = body as {
    platform?: string;
    buyerName?: string;
    buyerUsername?: string;
    listingId?: string;
    listingTitle?: string;
    message?: string;
  };

  if (!platform || !buyerName) {
    return NextResponse.json({ error: "platform and buyerName required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.create({
    data: {
      platform,
      buyerName,
      buyerUsername: buyerUsername || "",
      listingId: listingId || null,
      listingTitle: listingTitle || "",
      lastMessage: message || "",
      lastMessageAt: new Date(),
      messages: message
        ? {
            create: {
              sender: "buyer",
              content: message,
              platform,
            },
          }
        : undefined,
    },
    include: { messages: true },
  });

  return NextResponse.json(conversation, { status: 201 });
}
