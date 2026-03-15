import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: "admin@listblitz.io" },
    });

    if (existing) {
      return NextResponse.json({ message: "Admin already exists" });
    }

    const passwordHash = await hashPassword("admin");

    await prisma.user.create({
      data: {
        email: "admin@listblitz.io",
        username: "admin",
        passwordHash,
        role: "admin",
        onboarded: true,
      },
    });

    return NextResponse.json({ message: "Admin user created" });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
