ALTER TABLE "User"
  ALTER COLUMN "controllerApprovalRequired" SET DEFAULT false;

UPDATE "User"
SET "controllerApprovalRequired" = false
WHERE role = 'CONTROLLER';
