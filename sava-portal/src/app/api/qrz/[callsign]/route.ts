import { lookupCallsign } from '@/lib/qrz'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ callsign: string }> }
): Promise<Response> {
  const { callsign } = await ctx.params
  const info = await lookupCallsign(callsign.toUpperCase())
  if (!info) return new Response(null, { status: 404 })
  return Response.json(info)
}
