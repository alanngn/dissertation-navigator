-- AlterTable
ALTER TABLE "AuditFinding" ADD COLUMN "issue" TEXT;
ALTER TABLE "AuditFinding" ADD COLUMN "whyItMatters" TEXT;
ALTER TABLE "AuditFinding" ADD COLUMN "howToFix" TEXT;
ALTER TABLE "AuditFinding" ADD COLUMN "navigatorTip" TEXT;
