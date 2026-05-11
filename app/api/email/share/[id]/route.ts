import { NextRequest, NextResponse } from "next/server";

import { getSharedInboxByToken, revokeEmailShare } from "@/lib/dto/email-share";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = parseInt(value || `${fallback}`, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { searchParams } = new URL(req.url);
  const page = parsePositiveInt(searchParams.get("page"), 1, 100000);
  const pageSize = parsePositiveInt(searchParams.get("size"), 10, 100);

  try {
    const inbox = await getSharedInboxByToken(params.id, page, pageSize);
    if (!inbox) {
      return NextResponse.json(
        { error: "Share link is invalid or expired" },
        { status: 404 },
      );
    }

    return NextResponse.json(inbox, { status: 200 });
  } catch (error) {
    console.error("Error fetching shared email inbox:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const share = await revokeEmailShare(params.id);
    return NextResponse.json(
      {
        id: share.id,
        active: share.active,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.message === "Email share not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("Error revoking email share:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
