import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET — List all conversations, optionally filtered by platform or status */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (platform) where.platform = platform;
  if (status) where.status = status;

  const conversations = await prisma.conversation.findMany({
    where,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });

  const unreadCount = await prisma.conversation.count({ where: { unread: true } });

  return NextResponse.json({ conversations, unreadCount });
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
