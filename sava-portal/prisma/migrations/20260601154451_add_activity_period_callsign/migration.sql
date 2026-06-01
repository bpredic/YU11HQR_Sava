-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityPeriod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activatorId" INTEGER NOT NULL,
    "callsign" TEXT NOT NULL DEFAULT '',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "band" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityPeriod_activatorId_fkey" FOREIGN KEY ("activatorId") REFERENCES "Activator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActivityPeriod" ("activatorId", "band", "createdAt", "endAt", "frequency", "id", "mode", "startAt") SELECT "activatorId", "band", "createdAt", "endAt", "frequency", "id", "mode", "startAt" FROM "ActivityPeriod";
DROP TABLE "ActivityPeriod";
ALTER TABLE "new_ActivityPeriod" RENAME TO "ActivityPeriod";
CREATE INDEX "ActivityPeriod_activatorId_idx" ON "ActivityPeriod"("activatorId");
CREATE INDEX "ActivityPeriod_callsign_idx" ON "ActivityPeriod"("callsign");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
