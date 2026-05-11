CREATE TABLE "email_shares"
(
  "id" TEXT NOT NULL,
  "userEmailId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_shares_token_key" ON "email_shares"("token");
CREATE INDEX "email_shares_userEmailId_active_idx" ON "email_shares"("userEmailId", "active");
CREATE INDEX "email_shares_createdById_createdAt_idx" ON "email_shares"("createdById", "createdAt");

ALTER TABLE "email_shares" ADD CONSTRAINT "email_shares_userEmailId_fkey"
FOREIGN KEY ("userEmailId") REFERENCES "user_emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_shares" ADD CONSTRAINT "email_shares_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
