import { NextRequest, NextResponse } from "next/server";
import { runChecksForCategory } from "@/lib/diagnostics/check-runner";
import { getCategoryById } from "@/lib/diagnostics/check-registry";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { category } = body as { category?: string };
  if (!category || !getCategoryById(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  try {
    const result = await runChecksForCategory(category);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Check execution failed" },
      { status: 500 }
    );
  }
}
