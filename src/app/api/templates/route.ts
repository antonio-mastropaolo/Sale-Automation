import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, category, brand, condition, description, tags, platforms } =
    body as {
      name?: string;
      category?: string;
      brand?: string;
      condition?: string;
      description?: string;
      tags?: string[];
      platforms?: string[];
    };

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const template = await prisma.template.create({
    data: {
      name: name.trim(),
      category: category?.trim() || "",
      brand: brand?.trim() || "",
      condition: condition?.trim() || "Good",
      description: description?.trim() || "",
      tags: JSON.stringify(tags || []),
      platforms: JSON.stringify(platforms || []),
    },
  });

  return NextResponse.json(template, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Query param 'id' is required" },
      { status: 400 }
    );
  }

  try {
    await prisma.template.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    );
  }
}
