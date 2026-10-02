-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MonitorStatus" AS ENUM ('UNKNOWN', 'ONLINE', 'UNSTABLE', 'OFFLINE', 'PAUSED');

-- CreateEnum
CREATE TYPE "CheckState" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CheckOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'COLLECTOR_ERROR', 'BLOCKED');

-- CreateEnum
CREATE TYPE "IncidentEndReason" AS ENUM ('RECOVERED', 'CONFIG_CHANGED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMPTZ(3),
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Monitor" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "expectedStatus" INTEGER NOT NULL DEFAULT 200,
    "intervalSeconds" INTEGER NOT NULL DEFAULT 300,
    "timeoutMs" INTEGER NOT NULL DEFAULT 10000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "MonitorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "configRevision" INTEGER NOT NULL DEFAULT 1,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "firstFailureAt" TIMESTAMPTZ(3),
    "lastCompletedAt" TIMESTAMPTZ(3),
    "nextCheckAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" UUID,
    "leaseUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckRun" (
    "id" UUID NOT NULL,
    "monitorId" UUID NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL,
    "revision" INTEGER NOT NULL,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "state" "CheckState" NOT NULL DEFAULT 'QUEUED',
    "leaseToken" UUID,
    "leaseUntil" TIMESTAMPTZ(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "outcome" "CheckOutcome",
    "httpStatus" INTEGER,
    "latencyMs" INTEGER,
    "errorCode" VARCHAR(80),

    CONSTRAINT "CheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" UUID NOT NULL,
    "monitorId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3),
    "endReason" "IncidentEndReason",
    "failureCode" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPage" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPageMonitor" (
    "statusPageId" UUID NOT NULL,
    "monitorId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "publicName" VARCHAR(80) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StatusPageMonitor_pkey" PRIMARY KEY ("statusPageId","monitorId")
);

-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
    "workerId" VARCHAR(100) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" VARCHAR(40) NOT NULL,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("workerId")
);

-- CreateTable
CREATE TABLE "MaintenanceLease" (
    "name" VARCHAR(80) NOT NULL,
    "token" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MaintenanceLease_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Monitor_ownerId_createdAt_idx" ON "Monitor"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Monitor_id_ownerId_key" ON "Monitor"("id", "ownerId");

-- CreateIndex
CREATE INDEX "CheckRun_monitorId_completedAt_idx" ON "CheckRun"("monitorId", "completedAt" DESC);

-- CreateIndex
CREATE INDEX "CheckRun_completedAt_idx" ON "CheckRun"("completedAt");

-- CreateIndex
CREATE INDEX "CheckRun_state_leaseUntil_idx" ON "CheckRun"("state", "leaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "CheckRun_monitorId_scheduledAt_key" ON "CheckRun"("monitorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Incident_monitorId_startedAt_idx" ON "Incident"("monitorId", "startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_ownerId_key" ON "StatusPage"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_slug_key" ON "StatusPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_id_ownerId_key" ON "StatusPage"("id", "ownerId");

-- CreateIndex
CREATE INDEX "StatusPageMonitor_monitorId_ownerId_idx" ON "StatusPageMonitor"("monitorId", "ownerId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPage" ADD CONSTRAINT "StatusPage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageMonitor" ADD CONSTRAINT "StatusPageMonitor_statusPageId_ownerId_fkey" FOREIGN KEY ("statusPageId", "ownerId") REFERENCES "StatusPage"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageMonitor" ADD CONSTRAINT "StatusPageMonitor_monitorId_ownerId_fkey" FOREIGN KEY ("monitorId", "ownerId") REFERENCES "Monitor"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;
