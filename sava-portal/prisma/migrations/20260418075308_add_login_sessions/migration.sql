-- CreateTable
CREATE TABLE "LoginSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activatorId" INTEGER NOT NULL,
    "loggedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginSession_activatorId_fkey" FOREIGN KEY ("activatorId") REFERENCES "Activator" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LoginSession_activatorId_idx" ON "LoginSession"("activatorId");
