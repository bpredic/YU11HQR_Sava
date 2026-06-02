import { getDxCluster, type DxSpot } from '@/lib/dxcluster'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const cluster = getDxCluster()
  const encoder = new TextEncoder()

  let spotHandler: ((spot: DxSpot) => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      spotHandler = (spot: DxSpot) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(spot)}\n\n`))
        } catch {
          // client disconnected; cleanup handled by cancel
        }
      }

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          if (heartbeat) clearInterval(heartbeat)
        }
      }, 25_000)

      cluster.on('spot', spotHandler)
    },
    cancel() {
      if (spotHandler) cluster.off('spot', spotHandler)
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
