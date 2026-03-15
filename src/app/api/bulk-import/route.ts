import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  return lines.map((line) => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  });
}

export async function POST(request: NextRequest) {
  let csvText: string;
  try {
    csvText = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Could not read request body" },
      { status: 400 }
    );
  }

  if (!csvText.trim()) {
    return NextResponse.json(
      { error: "Empty CSV body" },
      { status: 400 }
    );
  }

  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "CSV must include a header row and at least one data row" },
      { status: 400 }
    );
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const EXPECTED_HEADERS = [
    "title",
    "description",
    "category",
    "brand",
    "size",
    "condition",
    "price",
    "costprice",
  ];

  // Map header names to column indices
  const colIndex: Record<string, number> = {};
  for (const name of EXPECTED_HEADERS) {
    const idx = headers.indexOf(name);
    if (idx !== -1) colIndex[name] = idx;
  }

  const errors: string[] = [];
  let imported = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const get = (col: string) =>
      colIndex[col] !== undefined ? (row[colIndex[col]] || "").trim() : "";

    const title = get("title");
    const priceStr = get("price");

    // Skip rows with missing title or price
    if (!title) {
      errors.push(`Row ${rowNum}: missing title, skipped`);
      continue;
    }
    if (!priceStr) {
      errors.push(`Row ${rowNum}: missing price, skipped`);
      continue;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      errors.push(`Row ${rowNum}: invalid price "${priceStr}", skipped`);
      continue;
    }

    const costPriceStr = get("costprice");
    const costPrice = costPriceStr ? parseFloat(costPriceStr) : 0;

    try {
      await prisma.listing.create({
        data: {
          title,
          description: get("description") || "",
          category: get("category") || "Other",
          brand: get("brand") || "",
          size: get("size") || "",
          condition: get("condition") || "Good",
          price,
          costPrice: isNaN(costPrice) ? 0 : costPrice,
        },
      });
      imported++;
    } catch (err) {
      errors.push(
        `Row ${rowNum}: database error — ${err instanceof Error ? err.message : "unknown"}`
      );
    }
  }

  return NextResponse.json({ imported, errors });
}
