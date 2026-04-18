-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activator" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "callsign" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Activator" ("callsign", "createdAt", "email", "id", "lastLoginAt", "password") SELECT "callsign", "createdAt", "email", "id", "lastLoginAt", "password" FROM "Activator";
DROP TABLE "Activator";
ALTER TABLE "new_Activator" RENAME TO "Activator";
CREATE UNIQUE INDEX "Activator_callsign_key" ON "Activator"("callsign");
CREATE UNIQUE INDEX "Activator_email_key" ON "Activator"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
