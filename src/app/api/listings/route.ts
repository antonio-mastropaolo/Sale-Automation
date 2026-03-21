import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { logActivity } from "@/lib/activity-log";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const offset = parseInt(searchParams.get("offset") || "0");

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where: status ? { status } : undefined,
      include: {
        images: { orderBy: { order: "asc" } },
        platformListings: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.listing.count({ where: status ? { status } : undefined }),
  ]);

  return NextResponse.json({ listings, total, limit, offset });
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data" },
      { status: 400 }
    );
  }

  const rawTitle = (formData.get("title") as string) || "";
  const description = (formData.get("description") as string) || "";
  const category = (formData.get("category") as string) || "";
  const brand = (formData.get("brand") as string) || "";
  const size = (formData.get("size") as string) || "";
  const condition = (formData.get("condition") as string) || "Good";
  const price = parseFloat(formData.get("price") as string);

  // Sanitize: strip HTML tags from user input
  const title = rawTitle.replace(/<[^>]*>/g, "").trim();
  const safeDescription = description.replace(/<[^>]*>/g, "").trim();

  if (!title || !safeDescription || !category || isNaN(price)) {
    return NextResponse.json(
      { error: "Missing required fields: title, description, category, and price are required" },
      { status: 400 }
    );
  }

  // Validate price
  if (price <= 0) {
    return NextResponse.json(
      { error: "Price must be greater than zero" },
      { status: 400 }
    );
  }
  if (price > 1_000_000) {
    return NextResponse.json(
      { error: "Price exceeds maximum allowed value ($1,000,000)" },
      { status: 400 }
    );
  }

  // Validate title length
  if (title.length > 200) {
    return NextResponse.json(
      { error: "Title must be 200 characters or fewer" },
      { status: 400 }
    );
  }

  // Validate category
  const VALID_CATEGORIES = [
    "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories",
    "Dresses", "Activewear", "Bags", "Jewelry", "Streetwear",
    "Vintage", "Designer", "Sportswear", "Other",
  ];
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate description length
  if (safeDescription.length > 10_000) {
    return NextResponse.json(
      { error: "Description must be 10,000 characters or fewer" },
      { status: 400 }
    );
  }

  // Validate condition
  const VALID_CONDITIONS = ["New with tags", "Like new", "Good", "Fair", "Poor"];
  const safeCondition = VALID_CONDITIONS.includes(condition) ? condition : "Good";

  // Handle image uploads (max 8)
  const images = (formData.getAll("images") as File[]).slice(0, 8);
  const imagePaths: { path: string; order: number }[] = [];

  if (images.length > 0) {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      if (file.size === 0) continue;

      const ext = path.extname(file.name) || ".jpg";
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(uploadDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      imagePaths.push({ path: `/uploads/${filename}`, order: i });
    }
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      description: safeDescription,
      category,
      brand: brand.replace(/<[^>]*>/g, "").trim(),
      size: size.replace(/<[^>]*>/g, "").trim(),
      condition: safeCondition,
      price,
      images: {
        create: imagePaths,
      },
    },
    include: {
      images: { orderBy: { order: "asc" } },
      platformListings: true,
    },
  });

  await logActivity({ type: "listing_created", title: listing.title, severity: "success" });

  return NextResponse.json(listing, { status: 201 });
}
