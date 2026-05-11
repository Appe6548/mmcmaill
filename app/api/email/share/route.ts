import { NextRequest, NextResponse } from "next/server";

import { createOrGetEmailShare } from "@/lib/dto/email-share";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

function buildShareUrl(req: NextRequest, token: string) {
  const origin = req.headers.get("origin") || req.nextUrl.origin;
  return `${origin}/share/email/${token}`;
}

function serializeShare(
  req: NextRequest,
  share: Awaited<ReturnType<typeof createOrGetEmailShare>>,
) {
  return {
    id: share.id,
    token: share.token,
    active: share.active,
    emailAddress: share.userEmail.emailAddress,
    url: buildShareUrl(req, share.token),
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const userEmailId = body?.userEmailId;

    if (!userEmailId || typeof userEmailId !== "string") {
      return NextResponse.json(
        { error: "Missing userEmailId" },
        { status: 400 },
      );
    }

    const share = await createOrGetEmailShare(userEmailId, user.id);
    return NextResponse.json(serializeShare(req, share), { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.message === "User email not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("Error creating email share:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
