import { prisma } from '@/lib/db'

/**
 * Deletes a log file and fixes up any QSOs in other log files that were
 * marked as duplicates of QSOs in the deleted file.
 *
 * When the original log file is deleted, QSOs in other files that pointed
 * to it become "orphaned duplicates". This function either:
 *   - Re-points them to another existing non-duplicate with the same key, or
 *   - Promotes the earliest orphan to non-duplicate and re-points the rest to it.
 */
export async function deleteLogFile(logFileId: number): Promise<void> {
  // 1. Collect IDs and keys of QSOs that will be cascade-deleted
  const qsosToDelete = await prisma.qso.findMany({
    where: { logFileId },
    select: { id: true, activatorCall: true, hunterCall: true, band: true, mode: true },
  })

  if (qsosToDelete.length > 0) {
    const deleteIds = qsosToDelete.map(q => q.id)

    // 2. Find QSOs in OTHER log files whose duplicateOfId points to a deleted QSO
    const orphaned = await prisma.qso.findMany({
      where: { duplicateOfId: { in: deleteIds } },
      select: { id: true, activatorCall: true, hunterCall: true, band: true, mode: true },
      orderBy: { id: 'asc' },
    })

    if (orphaned.length > 0) {
      // 3. Group orphaned QSOs by activatorCall|hunterCall|band|mode
      const groups = new Map<string, { id: number; activatorCall: string; hunterCall: string; band: string; mode: string }[]>()
      for (const q of orphaned) {
        const key = `${q.activatorCall}|${q.hunterCall}|${q.band}|${q.mode}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(q)
      }

      for (const [, group] of groups) {
        const { activatorCall, hunterCall, band, mode } = group[0]

        // 4. Check if a non-duplicate with the same key already exists outside the deleted file
        const existingOriginal = await prisma.qso.findFirst({
          where: {
            activatorCall,
            hunterCall,
            band,
            mode,
            isDuplicate: false,
            logFileId: { not: logFileId },
          },
          orderBy: { id: 'asc' },
          select: { id: true },
        })

        if (existingOriginal) {
          // Re-point orphans to the surviving original
          await prisma.qso.updateMany({
            where: { id: { in: group.map(q => q.id) } },
            data: { duplicateOfId: existingOriginal.id },
          })
        } else {
          // No original survives — promote the earliest orphan
          const [first, ...rest] = group
          await prisma.qso.update({
            where: { id: first.id },
            data: { isDuplicate: false, duplicateOfId: null },
          })
          if (rest.length > 0) {
            await prisma.qso.updateMany({
              where: { id: { in: rest.map(q => q.id) } },
              data: { duplicateOfId: first.id },
            })
          }
        }
      }
    }
  }

  // 5. Delete the log file (cascades to its QSOs)
  await prisma.logFile.delete({ where: { id: logFileId } })
}
