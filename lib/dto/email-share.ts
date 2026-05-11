import { randomBytes } from "crypto";

import { prisma } from "@/lib/db";

function createShareToken() {
  return randomBytes(32).toString("base64url");
}

const emailShareInclude = {
  userEmail: {
    select: {
      id: true,
      emailAddress: true,
      deletedAt: true,
    },
  },
} as const;

export async function createOrGetEmailShare(
  userEmailId: string,
  createdById: string,
) {
  const userEmail = await prisma.userEmail.findFirst({
    where: {
      id: userEmailId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!userEmail) {
    throw new Error("User email not found");
  }

  const existingShare = await prisma.emailShare.findFirst({
    where: {
      userEmailId,
      active: true,
    },
    include: emailShareInclude,
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (existingShare) {
    return existingShare;
  }

  return prisma.emailShare.create({
    data: {
      userEmailId,
      createdById,
      token: createShareToken(),
      active: true,
    },
    include: emailShareInclude,
  });
}

export async function revokeEmailShare(id: string) {
  const share = await prisma.emailShare.findUnique({
    where: {
      id,
    },
    include: emailShareInclude,
  });

  if (!share) {
    throw new Error("Email share not found");
  }

  if (!share.active) {
    return share;
  }

  return prisma.emailShare.update({
    where: {
      id,
    },
    data: {
      active: false,
    },
    include: emailShareInclude,
  });
}

export async function regenerateEmailShare(id: string) {
  const share = await prisma.emailShare.findUnique({
    where: {
      id,
    },
    include: emailShareInclude,
  });

  if (!share || share.userEmail.deletedAt) {
    throw new Error("Email share not found");
  }

  return prisma.emailShare.update({
    where: {
      id,
    },
    data: {
      token: createShareToken(),
      active: true,
    },
    include: emailShareInclude,
  });
}

export async function getSharedInboxByToken(
  token: string,
  page: number,
  pageSize: number,
) {
  const share = await prisma.emailShare.findUnique({
    where: {
      token,
    },
    include: emailShareInclude,
  });

  if (!share || !share.active || share.userEmail.deletedAt) {
    return null;
  }

  const emailAddress = share.userEmail.emailAddress;

  const [list, total] = await prisma.$transaction([
    prisma.forwardEmail.findMany({
      where: {
        to: emailAddress,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.forwardEmail.count({
      where: {
        to: emailAddress,
      },
    }),
  ]);

  return {
    share: {
      id: share.id,
      token: share.token,
      active: share.active,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    },
    emailAddress,
    list,
    total,
  };
}
