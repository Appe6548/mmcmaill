import { NextRequest, NextResponse } from "next/server";

import { regenerateEmailShare } from "@/lib/dto/email-share";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

function buildShareUrl(req: NextRequest, token: string) {
  const origin = req.headers.get("origin") || req.nextUrl.origin;
  return `${origin}/share/email/${token}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const share = await regenerateEmailShare(params.id);
    return NextResponse.json(
      {
        id: share.id,
        token: share.token,
        active: share.active,
        emailAddress: share.userEmail.emailAddress,
        url: buildShareUrl(req, share.token),
        createdAt: share.createdAt,
        updatedAt: share.updatedAt,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.message === "Email share not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("Error regenerating email share:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
