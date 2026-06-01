/**
 * Fix duplicateOfId for QSOs where isDuplicate=true but duplicateOfId is null.
 *
 * This happens for within-file duplicates: when two QSOs in the same uploaded
 * file share the same activatorCall+hunterCall+band+mode key, the first is
 * stored without knowing its future ID, so duplicateOfId is left null.
 *
 * Run with: npx tsx prisma/fix-duplicate-ids.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  // Find all duplicates that have no pointer to their original
  const orphans = await prisma.qso.findMany({
    where: { isDuplicate: true, duplicateOfId: null },
    select: { id: true, activatorCall: true, hunterCall: true, band: true, mode: true },
  })

  console.log(`Found ${orphans.length} duplicate QSOs with missing duplicateOfId`)
  if (orphans.length === 0) { console.log('Nothing to fix.'); return }

  let fixed = 0
  let notFound = 0

  for (const dup of orphans) {
    // Find the earliest non-duplicate QSO with the same key (lowest id = first inserted)
    const original = await prisma.qso.findFirst({
      where: {
        activatorCall: dup.activatorCall,
        hunterCall: dup.hunterCall,
        band: dup.band,
        mode: dup.mode,
        isDuplicate: false,
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    })

    if (original) {
      await prisma.qso.update({
        where: { id: dup.id },
        data: { duplicateOfId: original.id },
      })
      fixed++
    } else {
      console.warn(`  No original found for QSO #${dup.id} (${dup.activatorCall} / ${dup.hunterCall} / ${dup.band} / ${dup.mode})`)
      notFound++
    }
  }

  console.log(`Done. Fixed: ${fixed}, no original found: ${notFound}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
