-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- Seed a default project for any existing audits that lack one
INSERT INTO "Project" ("id", "name", "userId", "createdAt", "updatedAt")
SELECT 'unassigned-legacy', 'Unassigned', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "AuditRun");

-- AlterTable
ALTER TABLE "AuditRun" ADD COLUMN "projectId" TEXT;

-- Backfill existing audits
UPDATE "AuditRun"
SET "projectId" = 'unassigned-legacy'
WHERE "projectId" IS NULL;

-- Enforce required projectId
ALTER TABLE "AuditRun" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AuditRun_projectId_idx" ON "AuditRun"("projectId");

-- AddForeignKey
ALTER TABLE "AuditRun" ADD CONSTRAINT "AuditRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
