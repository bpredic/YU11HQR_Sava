import net from 'net'
import { EventEmitter } from 'events'
import { prisma } from './db'

export type DxSpot = {
  spotter: string
  freq: number
  dx: string
  comment: string
  mode: string
  time: string
  receivedAt: string
  isActivator: boolean
}

const MODE_RE = /\b(FT8|FT4|FT2|CW|SSB|FM|RTTY|PSK31|PSK|DIGI)\b/i

// Standard dial frequencies (kHz) for digital modes; ±1 kHz tolerance
const FT8_FREQS = [1840, 3573, 5357, 7074, 10136, 14074, 18100, 21074, 24915, 28074, 50313]
const FT4_FREQS = [3575, 7047, 10140, 14080, 18104, 21140, 24919, 28180]
const FT2_FREQS = [144170]

function modeFromFreq(freqKhz: number): string {
  const near = (list: number[]) => list.some(f => Math.abs(freqKhz - f) <= 1)
  if (near(FT8_FREQS)) return 'FT8'
  if (near(FT4_FREQS)) return 'FT4'
  if (near(FT2_FREQS)) return 'FT2'
  return ''
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

    const trimmedComment = comment.trim()
    const modeMatch = trimmedComment.match(MODE_RE)
    const freqKhz = parseFloat(freqStr)
    const mode = modeMatch ? modeMatch[1].toUpperCase() : modeFromFreq(freqKhz)

    const spot: DxSpot = {
      spotter,
      freq: freqKhz,
      dx: dxUpper,
      comment: trimmedComment,
      mode,
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
