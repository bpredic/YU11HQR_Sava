import net from 'net'
import { EventEmitter } from 'events'
import { prisma } from './db'

export type DxSpot = {
  spotter: string
  freq: number
  dx: string
  comment: string
  time: string
  receivedAt: string
  isActivator: boolean
}

// DX de SPOTTER:   FREQ  DX_CALL   COMMENT  HHMMZ
const SPOT_RE = /^DX de\s+([A-Z0-9/]+):\s+(\d+\.?\d*)\s+([A-Z0-9/]+)\s*(.*?)\s*(\d{4}Z)/i

const RECONNECT_DELAY_MS = 30_000
const CACHE_TTL_MS = 5 * 60_000

class DxClusterClient extends EventEmitter {
  private socket: net.Socket | null = null
  private buffer = ''
  private activatorCache = new Set<string>()
  private cacheTs = 0
  private cacheRefreshing = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false

  connect() {
    if (this.socket || this.destroyed) return

    const host = process.env.DXCLUSTER_HOST ?? 'dx.ozqrp.com'
    const port = parseInt(process.env.DXCLUSTER_PORT ?? '7300', 10)
    const callsign = process.env.DXCLUSTER_CALLSIGN ?? 'YU1HQR'

    const socket = new net.Socket()
    this.socket = socket

    socket.connect(port, host, () => {
      this.refreshCache().catch(() => {})
      // Small delay to wait for any login prompt before sending callsign
      setTimeout(() => {
        if (!socket.destroyed) socket.write(`${callsign}\r\n`)
      }, 800)
    })

    socket.on('data', (data: Buffer) => {
      this.buffer += data.toString('ascii')
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() ?? ''
      for (const line of lines) {
        this.parseLine(line.trim()).catch(() => {})
      }
    })

    socket.on('close', () => {
      this.socket = null
      this.scheduleReconnect()
    })

    socket.on('error', () => {
      socket.destroy()
      this.socket = null
      this.scheduleReconnect()
    })
  }

  private scheduleReconnect() {
    if (this.destroyed || this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, RECONNECT_DELAY_MS)
  }

  private async refreshCache() {
    if (this.cacheRefreshing) return
    this.cacheRefreshing = true
    try {
      const activators = await prisma.activator.findMany({ select: { callsign: true } })
      this.activatorCache = new Set(activators.map(a => a.callsign.toUpperCase()))
      this.cacheTs = Date.now()
    } finally {
      this.cacheRefreshing = false
    }
  }

  private async parseLine(line: string) {
    const m = line.match(SPOT_RE)
    if (!m) return

    const [, spotter, freqStr, dx, comment, time] = m

    if (Date.now() - this.cacheTs > CACHE_TTL_MS) {
      await this.refreshCache()
    }

    const dxUpper = dx.toUpperCase()
    const dxBase = dxUpper.split('/')[0]

    const spot: DxSpot = {
      spotter,
      freq: parseFloat(freqStr),
      dx: dxUpper,
      comment: comment.trim(),
      time,
      receivedAt: new Date().toISOString(),
      isActivator: this.activatorCache.has(dxUpper) || this.activatorCache.has(dxBase),
    }

    this.emit('spot', spot)
  }

  destroy() {
    this.destroyed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.socket?.destroy()
  }
}

declare global {
  // eslint-disable-next-line no-var
  var dxCluster: DxClusterClient | undefined
}

export function getDxCluster(): DxClusterClient {
  if (!global.dxCluster) {
    global.dxCluster = new DxClusterClient()
    global.dxCluster.connect()
  }
  return global.dxCluster
}
