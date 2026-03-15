import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  const reportPath = path.join(process.cwd(), "docs", "report-data.json");

  if (!fs.existsSync(reportPath)) {
    return NextResponse.json(
      { error: "No test report found. Run tests first with: npx playwright test" },
      { status: 404 }
    );
  }

  const raw = fs.readFileSync(reportPath, "utf-8");
  const data = JSON.parse(raw);
  return NextResponse.json(data);
}
