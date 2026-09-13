ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "controllerRemoved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "controllerApprovalRequired" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "ControllerApprovalRequest" (
  "id" TEXT NOT NULL,
  "controllerId" TEXT NOT NULL,
  "reviewedById" TEXT,
  "action" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ControllerApprovalRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ControllerApprovalRequest_controllerId_fkey"
    FOREIGN KEY ("controllerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ControllerApprovalRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ControllerApprovalRequest_controllerId_status_idx"
  ON "ControllerApprovalRequest"("controllerId", "status");
