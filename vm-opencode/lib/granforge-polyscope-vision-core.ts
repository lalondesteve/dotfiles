import { createConnection } from "node:net"

export type Stage = "simulator" | "rfb-preflight" | "browser" | "canvas" | "deadline" | "cancelled" | "indeterminate-click"

export class StageError extends Error {
  constructor(readonly stage: Stage, message: string) {
    super(`[${stage}] ${message}`)
  }
}

export const stageError = (stage: Stage, message: string) => new StageError(stage, message)

export const rfbPreflight = async (port: number, deadline: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const wait = Math.min(3_000, deadline - Date.now())
  if (wait <= 0) return reject(stageError("rfb-preflight", "operation deadline expired before RFB greeting"))
  if (signal?.aborted) return reject(stageError("cancelled", "operation cancelled during RFB preflight"))

  let settled = false
  let exactGreeting = false
  let greeting = Buffer.alloc(0)
  const socket = createConnection({ host: "127.0.0.1", port })
  let timer: ReturnType<typeof setTimeout>
  const abort = () => finish(stageError("cancelled", "operation cancelled during RFB preflight"))
  const finish = (error?: Error) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    signal?.removeEventListener("abort", abort)
    socket.destroy()
    error ? reject(error) : resolve()
  }
  timer = setTimeout(() => finish(stageError("rfb-preflight", `127.0.0.1:${port} timed out waiting for the 12-byte RFB greeting`)), wait)
  signal?.addEventListener("abort", abort, { once: true })
  socket.once("error", (error: NodeJS.ErrnoException) => finish(stageError("rfb-preflight", `127.0.0.1:${port} ${error.code === "ECONNREFUSED" ? "connection refused" : error.message}`)))
  socket.on("data", (chunk: Buffer) => {
    if (exactGreeting) return finish(stageError("rfb-preflight", `127.0.0.1:${port} sent trailing data after the RFB greeting`))
    const needed = 12 - greeting.length
    greeting = Buffer.concat([greeting, chunk.subarray(0, needed)])
    if (greeting.length < 12) return
    const value = greeting.subarray(0, 12).toString("ascii")
    if (value !== "RFB 003.008\n") return finish(stageError("rfb-preflight", `127.0.0.1:${port} sent unsupported or malformed RFB greeting ${JSON.stringify(value)}`))
    if (chunk.length > needed) return finish(stageError("rfb-preflight", `127.0.0.1:${port} sent trailing data after the RFB greeting`))
    exactGreeting = true
    socket.end()
  })
  socket.once("close", () => finish(exactGreeting ? undefined : stageError("rfb-preflight", `127.0.0.1:${port} closed before an exact RFB greeting`)))
})

export const deriveLoopbackVncPort = (ports: Record<string, Array<{ HostIp: string; HostPort: string }> | null>) => {
  const binding = ports["5900/tcp"]
  if (!Array.isArray(binding) || binding.length !== 1 || binding[0]?.HostIp !== "127.0.0.1" || !/^[1-9][0-9]{0,4}$/.test(binding[0]?.HostPort ?? "") || Number(binding[0]!.HostPort) > 65535) throw stageError("simulator", "missing approved loopback 5900/tcp binding")
  return Number(binding[0]!.HostPort)
}

export const remaining = (deadline: number, now: () => number = Date.now) => Math.max(0, deadline - now())

export const timeoutFor = (deadline: number, ceiling = Number.POSITIVE_INFINITY, now: () => number = Date.now) => {
  const available = remaining(deadline, now)
  if (available <= 0) throw stageError("deadline", "operation deadline expired")
  return Math.max(1, Math.min(available, ceiling))
}

export type RfbPointerEvent = { buttonMask: number; x: number; y: number }

const maxRfbClientMessageBytes = 1024 * 1024
const maxRememberedPointerEvents = 4096

export class RfbClientMessageStream {
  private buffer = Buffer.alloc(0)
  private pointerOffset = 0
  private readonly pointers: RfbPointerEvent[] = []
  private malformed = 0

  get pointerCount() { return this.pointerOffset + this.pointers.length }
  get malformedRevision() { return this.malformed }
  get bufferedLength() { return this.buffer.length }

  pointerEventsSince(index: number) {
    if (!Number.isSafeInteger(index) || index < this.pointerOffset || index > this.pointerCount) return undefined
    return this.pointers.slice(index - this.pointerOffset)
  }

  push(payload: Buffer | string) {
    if (typeof payload === "string") return this.rejectRemainder()
    if (payload.length === 0) return
    if (this.buffer.length + payload.length > maxRfbClientMessageBytes) return this.rejectRemainder()
    this.buffer = Buffer.concat([this.buffer, payload])

    while (this.buffer.length > 0) {
      const length = this.messageLength()
      if (length === undefined) return
      if (length < 0 || length > maxRfbClientMessageBytes) return this.rejectRemainder()
      if (this.buffer.length < length) return
      const message = this.buffer.subarray(0, length)
      this.buffer = this.buffer.subarray(length)
      if (message[0] === 5) {
        this.pointers.push({ buttonMask: message[1]!, x: message.readUInt16BE(2), y: message.readUInt16BE(4) })
        if (this.pointers.length > maxRememberedPointerEvents) {
          const removed = this.pointers.length - maxRememberedPointerEvents
          this.pointers.splice(0, removed)
          this.pointerOffset += removed
        }
      }
    }
  }

  private rejectRemainder() {
    this.malformed++
    this.buffer = Buffer.alloc(0)
  }

  private messageLength(): number | undefined {
    const type = this.buffer[0]!
    if (type === 0) return 20 // SetPixelFormat
    if (type === 3) return 10 // FramebufferUpdateRequest
    if (type === 4) return 8 // KeyEvent
    if (type === 5) return 6 // PointerEvent
    if (type === 150) return 10 // EnableContinuousUpdates
    if (type === 250) return 4 // XVP operation
    if (type === 255) return 12 // QEMU ExtendedKeyEvent
    if (type === 2) {
      if (this.buffer.length < 4) return undefined
      return 4 + 4 * this.buffer.readUInt16BE(2)
    }
    if (type === 6) {
      if (this.buffer.length < 8) return undefined
      const payloadLength = Math.abs(this.buffer.readInt32BE(4)) // Negative lengths identify ExtendedClipboard.
      return payloadLength > maxRfbClientMessageBytes - 8 ? -1 : 8 + payloadLength
    }
    if (type === 248) {
      if (this.buffer.length < 9) return undefined
      return 9 + this.buffer[8]!
    }
    if (type === 251) {
      if (this.buffer.length < 8) return undefined
      return 8 + 16 * this.buffer[6]!
    }
    return -1
  }
}

export type Operation = {
  deadline: number
  signal: AbortSignal
  readonly committed: boolean
  commit(): void
  throwIfAborted(): void
  race<T>(promise: Promise<T>): Promise<T>
}

type QueueItem<T> = {
  controller: AbortController
  deadline: number
  work: (operation: Operation) => Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
  settled: boolean
  finalized: boolean
  committed: boolean
  timer: ReturnType<typeof setTimeout>
  upstream?: AbortSignal
  upstreamAbort?: () => void
  abortListener: () => void
  operation: Operation
  cleanup?: Promise<void>
  quiesced: Promise<void>
  markQuiesced: () => void
}

export const createController = (options: {
  timeoutMs?: number
  disposeGraceMs?: number
  now?: () => number
  onActiveAbort?: (operation: Operation) => Promise<void>
} = {}) => {
  const now = options.now ?? Date.now
  const timeoutMs = options.timeoutMs ?? 30_000
  const disposeGraceMs = options.disposeGraceMs ?? 1_000
  const queue: QueueItem<unknown>[] = []
  let active: QueueItem<unknown> | undefined
  let disposed = false
  let disposal: Promise<void> | undefined
  const abortError = (signal: AbortSignal, committed = false) => {
    if (committed) {
      const cause = signal.reason === "deadline" ? "deadline expired" : "operation was cancelled"
      return stageError("indeterminate-click", `Click dispatch was committed before the ${cause}; state is indeterminate`)
    }
    return stageError(signal.reason === "deadline" ? "deadline" : "cancelled", signal.reason === "deadline" ? "operation deadline expired" : "operation cancelled")
  }
  const settle = (item: QueueItem<unknown>, error?: Error, value?: unknown) => {
    if (item.settled) return
    item.settled = true
    error ? item.reject(error) : item.resolve(value)
  }
  const finalize = (item: QueueItem<unknown>) => {
    if (item.finalized) return
    item.finalized = true
    clearTimeout(item.timer)
    item.controller.signal.removeEventListener("abort", item.abortListener)
    if (item.upstream && item.upstreamAbort) item.upstream.removeEventListener("abort", item.upstreamAbort)
  }
  const rejectQueue = (message: string) => {
    for (const item of queue.splice(0)) {
      finalize(item)
      item.controller.abort("cancelled")
      settle(item, stageError("cancelled", message))
      item.markQuiesced()
    }
  }
  const poison = (error: unknown) => {
    if (disposed) return
    disposed = true
    rejectQueue(`controller cleanup failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  const beginActiveCleanup = (item: QueueItem<unknown>) => {
    if (item.cleanup) return item.cleanup
    item.cleanup = Promise.resolve()
      .then(() => options.onActiveAbort?.(item.operation))
      .then(() => undefined, (error) => { poison(error) })
    return item.cleanup
  }
  const start = () => {
    if (active || disposed) return
    const item = queue.shift()
    if (!item) return
    if (item.controller.signal.aborted) {
      finalize(item)
      settle(item, abortError(item.controller.signal))
      item.markQuiesced()
      return start()
    }
    active = item
    Promise.resolve()
      .then(() => item.work(item.operation))
      .then(
        (value) => {
          if (!item.controller.signal.aborted) settle(item, undefined, value)
        },
        (error) => {
          if (!item.controller.signal.aborted) settle(item, error instanceof Error ? error : new Error(String(error)))
        },
      )
      .finally(async () => {
        finalize(item)
        await item.cleanup
        item.markQuiesced()
        if (active !== item) return
        active = undefined
        start()
      })
  }
  const enqueue = <T>(signal: AbortSignal | undefined, work: (operation: Operation) => Promise<T>) => new Promise<T>((resolve, reject) => {
    if (disposed) return reject(stageError("cancelled", "controller is disposed"))
    const controller = new AbortController()
    const deadline = now() + timeoutMs
    let markQuiesced!: () => void
    const quiesced = new Promise<void>((done) => { markQuiesced = done })
    const item = {} as QueueItem<T>
    const operation: Operation = {
      deadline,
      signal: controller.signal,
      get committed() { return item.committed },
      commit: () => {
        if (controller.signal.aborted) throw abortError(controller.signal, item.committed)
        if (now() >= deadline) {
          controller.abort("deadline")
          throw abortError(controller.signal, item.committed)
        }
        item.committed = true
      },
      throwIfAborted: () => {
        if (controller.signal.aborted) throw abortError(controller.signal, item.committed)
        if (now() >= deadline) {
          controller.abort("deadline")
          throw abortError(controller.signal, item.committed)
        }
      },
      race: <V>(promise: Promise<V>) => new Promise<V>((raceResolve, raceReject) => {
        if (controller.signal.aborted) return raceReject(abortError(controller.signal, item.committed))
        const abort = () => raceReject(abortError(controller.signal, item.committed))
        controller.signal.addEventListener("abort", abort, { once: true })
        promise.then(
          (value) => { controller.signal.removeEventListener("abort", abort); raceResolve(value) },
          (error) => { controller.signal.removeEventListener("abort", abort); raceReject(error) },
        )
      }),
    }
    const abortListener = () => {
      const current = item as QueueItem<unknown>
      const index = queue.indexOf(current)
      if (index >= 0) {
        queue.splice(index, 1)
        finalize(current)
        settle(current, abortError(controller.signal, current.committed))
        current.markQuiesced()
        return
      }
      if (active === current) {
        finalize(current)
        settle(current, abortError(controller.signal, current.committed))
        void beginActiveCleanup(current)
      }
    }
    Object.assign(item, {
      controller,
      deadline,
      work,
      resolve,
      reject,
      settled: false,
      finalized: false,
      committed: false,
      upstream: signal,
      abortListener,
      operation,
      quiesced,
      markQuiesced,
    })
    item.timer = setTimeout(() => controller.abort("deadline"), Math.max(0, deadline - now()))
    item.upstreamAbort = () => controller.abort("cancelled")
    controller.signal.addEventListener("abort", abortListener, { once: true })
    if (signal) {
      if (signal.aborted) controller.abort("cancelled")
      else signal.addEventListener("abort", item.upstreamAbort, { once: true })
    }
    if (controller.signal.aborted) {
      finalize(item as QueueItem<unknown>)
      settle(item as QueueItem<unknown>, abortError(controller.signal, item.committed))
      item.markQuiesced()
      return
    }
    queue.push(item as QueueItem<unknown>)
    start()
  })
  const dispose = () => {
    if (disposal) return disposal
    disposed = true
    rejectQueue("controller is disposed")
    const current = active
    if (current && !current.controller.signal.aborted) current.controller.abort("cancelled")
    const quiescence = current?.quiesced ?? Promise.resolve()
    disposal = new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve()
      }
      const timer = setTimeout(finish, disposeGraceMs)
      void quiescence.then(finish, finish)
    })
    return disposal
  }
  return { enqueue, dispose, get disposed() { return disposed } }
}
