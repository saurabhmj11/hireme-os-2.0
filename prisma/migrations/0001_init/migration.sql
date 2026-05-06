-- CreateTable
CREATE TABLE "Application" (
    "number" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "salary" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "autoApplied" BOOLEAN NOT NULL DEFAULT false,
    "lastFollowUp" TEXT NOT NULL DEFAULT '',
    "nextFollowUp" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "EvaluationReport" (
    "id" TEXT NOT NULL,
    "appNumber" INTEGER,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "overallGrade" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "block1" TEXT NOT NULL,
    "block2" TEXT NOT NULL,
    "block3" TEXT NOT NULL,
    "block4" TEXT NOT NULL,
    "block5" TEXT NOT NULL,
    "block6" TEXT NOT NULL,
    "dimensions" TEXT NOT NULL,
    "rawOutput" TEXT,
    "jdText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewStory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reflection" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringWeight" (
    "id" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulerConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "scanIntervalMin" INTEGER NOT NULL DEFAULT 60,
    "followUpIntervalDays" INTEGER NOT NULL DEFAULT 7,
    "autoEvaluate" BOOLEAN NOT NULL DEFAULT true,
    "autoApply" BOOLEAN NOT NULL DEFAULT false,
    "minScoreToApply" DOUBLE PRECISION NOT NULL DEFAULT 3.5,
    "minGradeToApply" TEXT NOT NULL DEFAULT 'B',
    "portals" TEXT NOT NULL DEFAULT 'linkedin,indeed,glassdoor,wellfound',
    "searchQueries" TEXT NOT NULL DEFAULT 'AI Engineer,ML Engineer,LLM Engineer,Data Scientist',
    "locationFilter" TEXT NOT NULL DEFAULT '',
    "lastRunAt" TEXT NOT NULL DEFAULT '',
    "nextRunAt" TEXT NOT NULL DEFAULT '',
    "notifyEmail" TEXT NOT NULL DEFAULT '',
    "notifyOnAutoApply" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnNewMatch" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnFollowUp" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCycleComplete" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnErrors" BOOLEAN NOT NULL DEFAULT true,
    "notifyDigestMode" TEXT NOT NULL DEFAULT 'instant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "appNumber" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'email',
    "content" TEXT NOT NULL,
    "sentAt" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoApplyLog" (
    "id" TEXT NOT NULL,
    "appNumber" INTEGER,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoApplyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleHistory" (
    "id" TEXT NOT NULL,
    "scannedJobs" INTEGER NOT NULL DEFAULT 0,
    "evaluatedJobs" INTEGER NOT NULL DEFAULT 0,
    "autoAppliedJobs" INTEGER NOT NULL DEFAULT 0,
    "followUpsScheduled" INTEGER NOT NULL DEFAULT 0,
    "followUpsSent" INTEGER NOT NULL DEFAULT 0,
    "newApplications" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT NOT NULL DEFAULT '[]',
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL,
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpUser" TEXT NOT NULL DEFAULT '',
    "smtpPass" TEXT NOT NULL DEFAULT '',
    "fromEmail" TEXT NOT NULL DEFAULT '',
    "fromName" TEXT NOT NULL DEFAULT '',
    "useTLS" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoringWeight_dimension_key" ON "ScoringWeight"("dimension");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulerConfig_name_key" ON "SchedulerConfig"("name");
