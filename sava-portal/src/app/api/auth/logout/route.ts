import { deleteSession } from '@/lib/auth'

export async function POST(): Promise<Response> {
  await deleteSession()
  return Response.json({ ok: true })
}
