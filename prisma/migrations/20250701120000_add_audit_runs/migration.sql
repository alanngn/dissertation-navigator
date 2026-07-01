-- CreateTable
CREATE TABLE "AuditRun" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "agentsRun" INTEGER NOT NULL,
    "agentsFailed" INTEGER NOT NULL,
    "redTotal" INTEGER NOT NULL,
    "yellowTotal" INTEGER NOT NULL,
    "greenTotal" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAgentResult" (
    "id" TEXT NOT NULL,
    "auditRunId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "rawOutput" TEXT NOT NULL DEFAULT '',
    "error" TEXT,

    CONSTRAINT "AuditAgentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL,
    "agentResultId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditRun_slug_key" ON "AuditRun"("slug");

-- CreateIndex
CREATE INDEX "AuditRun_userId_idx" ON "AuditRun"("userId");

-- CreateIndex
CREATE INDEX "AuditRun_slug_idx" ON "AuditRun"("slug");

-- CreateIndex
CREATE INDEX "AuditAgentResult_auditRunId_idx" ON "AuditAgentResult"("auditRunId");

-- CreateIndex
CREATE INDEX "AuditFinding_agentResultId_idx" ON "AuditFinding"("agentResultId");

-- AddForeignKey
ALTER TABLE "AuditAgentResult" ADD CONSTRAINT "AuditAgentResult_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_agentResultId_fkey" FOREIGN KEY ("agentResultId") REFERENCES "AuditAgentResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
