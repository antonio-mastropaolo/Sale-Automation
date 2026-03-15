import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateResetToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordReset.create({
        data: { email, token, expiresAt },
      });

      // In a real app, send an email. For now, log the reset URL.
      console.log(`\n===== PASSWORD RESET LINK =====`);
      console.log(`User: ${email}`);
      console.log(`URL: ${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`);
      console.log(`Expires: ${expiresAt.toISOString()}`);
      console.log(`===============================\n`);
    }

    // Always return success to avoid revealing if email exists
    return NextResponse.json({
      message: "If an account exists, a reset link has been sent",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
