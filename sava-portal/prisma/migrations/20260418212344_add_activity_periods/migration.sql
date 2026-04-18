-- CreateTable
CREATE TABLE "ActivityPeriod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activatorId" INTEGER NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "band" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityPeriod_activatorId_fkey" FOREIGN KEY ("activatorId") REFERENCES "Activator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ActivityPeriod_activatorId_idx" ON "ActivityPeriod"("activatorId");
