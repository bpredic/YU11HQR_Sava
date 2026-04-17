-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Activator" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "callsign" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LogFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activatorId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qsoCount" INTEGER NOT NULL DEFAULT 0,
    "firstQsoAt" DATETIME,
    "lastQsoAt" DATETIME,
    CONSTRAINT "LogFile_activatorId_fkey" FOREIGN KEY ("activatorId") REFERENCES "Activator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Qso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "logFileId" INTEGER NOT NULL,
    "activatorCall" TEXT NOT NULL,
    "hunterCall" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "datetime" DATETIME NOT NULL,
    "sentRst" TEXT NOT NULL,
    "rcvdRst" TEXT NOT NULL,
    "sentExch" TEXT,
    "rcvdExch" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" INTEGER,
    CONSTRAINT "Qso_logFileId_fkey" FOREIGN KEY ("logFileId") REFERENCES "LogFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Activator_callsign_key" ON "Activator"("callsign");

-- CreateIndex
CREATE UNIQUE INDEX "Activator_email_key" ON "Activator"("email");

-- CreateIndex
CREATE INDEX "Qso_hunterCall_idx" ON "Qso"("hunterCall");

-- CreateIndex
CREATE INDEX "Qso_activatorCall_idx" ON "Qso"("activatorCall");

-- CreateIndex
CREATE INDEX "Qso_logFileId_idx" ON "Qso"("logFileId");
