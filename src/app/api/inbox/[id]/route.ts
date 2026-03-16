import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET — Get a single conversation with all messages */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark as read
  if (conversation.unread) {
    await prisma.conversation.update({
      where: { id },
      data: { unread: false },
    });
    await prisma.message.updateMany({
      where: { conversationId: id, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json(conversation);
}

/** POST — Send a reply message */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, sender } = body as { content?: string; sender?: string };
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      sender: sender || "seller",
      content,
      platform: conversation.platform,
    },
  });

  // Update conversation's last message
  await prisma.conversation.update({
    where: { id },
    data: {
      lastMessage: content,
      lastMessageAt: new Date(),
      unread: sender === "buyer",
    },
  });

  // Also send to the platform via automation backend (best-effort)
  if ((sender || "seller") === "seller") {
    const AUTOMATION_API = process.env.AUTOMATION_API_URL || "http://localhost:8000";
    try {
      // If this is a live conversation (has a platform conversation ID), relay the message
      const convIdParts = id.split("-");
      const platformConvId = convIdParts.length > 2 ? convIdParts.slice(2).join("-") : id;

      await fetch(
        `${AUTOMATION_API}/v2/messages/${conversation.platform}/${platformConvId}?user_id=default-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
          signal: AbortSignal.timeout(15000),
        }
      );
    } catch {
      // Automation backend unavailable — message saved locally only
    }
  }

  return NextResponse.json(message, { status: 201 });
}

/** PATCH — Update conversation status */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status } = body as { status?: string };
  if (!status || !["open", "closed", "archived"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}

/** DELETE — Delete a conversation */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
