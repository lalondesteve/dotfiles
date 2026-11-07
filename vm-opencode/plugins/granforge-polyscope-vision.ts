import { execFile } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import { promisify } from "node:util"
import type { Plugin, ToolResult } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { chromium, type Browser, type BrowserContext, type Page, type WebSocket } from "playwright-core"
import {
  createController,
  deriveLoopbackVncPort,
  remaining,
  RfbClientMessageStream,
  rfbPreflight,
  StageError,
  stageError,
  timeoutFor,
  type Operation,
  type RfbPointerEvent,
} from "../lib/granforge-polyscope-vision-core"

const granforgeRoot = "/home/steve/granforge"
const run = promisify(execFile)
const recoveryAttempts = 2
const recoveryDeadlineMs = 30_000
const blackFrameGraceMs = 1_500
const outboundQuietMs = 25
const renderTrackerKey = "__granforgePolyscopeRenderTracker"
const approvedImageID = "sha256:a09bbbe59e27ca1a1badab77eb3eed0000c1fa82dac3b66e650a060b62f83ad7"

const targets = {
  gate1: { container: "granforge-urcap-gate1", hostPort: "6080", url: "http://127.0.0.1:6080/vnc.html?autoconnect=true&resize=scale" },
  gate2: { container: "granforge-urcap-gate2", hostPort: "6081", url: "http://127.0.0.1:6081/vnc.html?autoconnect=true&resize=scale" },
} as const

type TargetName = keyof typeof targets

type Box = { x: number; y: number; width: number; height: number }


type Screenshot = {
  id: string
  target: TargetName
  generation: number
  box: Box
  imageWidth: number
  imageHeight: number
  contentHash: string
  socket: WebSocket
  socketGeneration: number
  receivedSequence: number
  sentSequence: number
  renderGeneration: number
  canvasWidth: number
  canvasHeight: number
  completedDisplaySequence: number
}

type PageSession = {
  page: Page
  target: TargetName
  generation: number
  stale: boolean
  socket?: WebSocket
  socketGeneration?: number
  receivedSequence: number
  sentSequence: number
  clientMessages: RfbClientMessageStream
  completedDisplaySequence: number
}

type StableCanvas = {
  box: Box
  png: Buffer
  contentHash: string
  socket: WebSocket
  socketGeneration: number
  receivedSequence: number
  renderGeneration: number
  canvasWidth: number
  canvasHeight: number
  completedDisplaySequence: number
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const waitAtMost = async (promise: Promise<unknown>, ms: number) => {
  if (ms <= 0) return
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      promise,
      new Promise<void>((resolve) => { timer = setTimeout(resolve, ms) }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const sameBox = (left: Box, right: Box) =>
  left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height

const pointerHistoryStatus = (events: RfbPointerEvent[], expected: RfbPointerEvent[]) => {
  let expectedIndex = 0
  for (const event of events) {
    const next = expected[expectedIndex]
    if (!next) {
      if (event.buttonMask !== 0) return "invalid" as const
      continue
    }
    if (event.buttonMask === next.buttonMask && event.x === next.x && event.y === next.y) {
      expectedIndex++
      continue
    }
    // Playwright may move the pointer before each press. A button-up pointer
    // event is harmless until the next exact press begins the confirmation.
    if (next.buttonMask === 1 && event.buttonMask === 0) continue
    return "invalid" as const
  }
  return expectedIndex === expected.length ? "exact" as const : "pending" as const
}

const pngDimensions = (png: Buffer) => {
  if (
    png.length < 24 ||
    png[0] !== 0x89 || png[1] !== 0x50 || png[2] !== 0x4e || png[3] !== 0x47 ||
    png.toString("ascii", 12, 16) !== "IHDR"
  ) throw new Error("PolyScope did not produce a valid PNG screenshot")
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  if (width < 1 || height < 1) throw new Error("PolyScope produced an empty PNG screenshot")
  return { width, height }
}

const isNoVncSocket = (socketURL: string, target: TargetName) => {
  try {
    const socket = new URL(socketURL)
    const endpoint = new URL(targets[target].url)
    return (socket.protocol === "ws:" || socket.protocol === "wss:") &&
      socket.hostname === "127.0.0.1" &&
      socket.hostname === endpoint.hostname &&
      socket.port === targets[target].hostPort &&
      socket.port === endpoint.port &&
      (socket.pathname === "/websockify" || socket.pathname.startsWith("/websockify/"))
  } catch {
    return false
  }
}

export default (async ({ directory }) => {
  if (directory !== granforgeRoot && !directory.startsWith(`${granforgeRoot}/`)) return {}

  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let session: PageSession | undefined
  let latestScreenshot: Screenshot | undefined
  let pageGeneration = 0
  let socketGeneration = 0
  let disposed = false
  const controller = createController({
    timeoutMs: recoveryDeadlineMs,
    onActiveAbort: async () => { await quarantineBrowser(Date.now() + 1_000) },
  })

  const enqueue = <T>(signal: AbortSignal | undefined, operation: (deadline: number, current: Operation) => Promise<T>) =>
    controller.enqueue(signal, async (current) => operation(current.deadline, current))


  const invalidateScreenshot = () => {
    latestScreenshot = undefined
  }

  const markStale = (current: PageSession) => {
    if (session !== current) return
    current.stale = true
    invalidateScreenshot()
  }

  const discardPage = async (deadline: number) => {
    const current = session
    session = undefined
    invalidateScreenshot()
    if (!current) return
    current.stale = true
    const close = current.page.close().catch(() => {})
    await waitAtMost(close, remaining(deadline))
  }

  const quarantineBrowser = async (deadline: number) => {
    const currentSession = session
    const current = context
    const currentBrowser = browser
    // Clear shared references before closing so an overdue close cannot poison
    // the next operation, then await the best effort close within its budget.
    session = undefined
    context = undefined
    browser = undefined
    if (currentSession) currentSession.stale = true
    invalidateScreenshot()
    const close = Promise.allSettled([
      currentSession?.page.close().catch(() => {}),
      current?.close().catch(() => {}),
      currentBrowser?.close().catch(() => {}),
    ])
    await waitAtMost(close, remaining(deadline))
  }

  const verifySimulator = async (target: TargetName, deadline: number, operation: Operation) => {
    try {
      operation.throwIfAborted()
      if (remaining(deadline) <= 0) throw stageError("deadline", "operation deadline expired before simulator verification")
      const { stdout } = await run("docker", [
        "inspect", "--format",
        "{{.Name}}|{{.Config.Image}}|{{.State.Running}}|{{.Image}}|{{json .NetworkSettings.Ports}}",
        targets[target].container,
      ], { timeout: timeoutFor(deadline), signal: operation.signal })
      operation.throwIfAborted()
      const [name, image, running, imageID, portsJSON] = stdout.trim().split("|", 5)
      const ports = JSON.parse(portsJSON ?? "") as Record<string, Array<{ HostIp: string; HostPort: string }> | null>
      const noVnc = ports["6080/tcp"]
      const config = targets[target]
      const loopbackPort = (binding: typeof noVnc) =>
        Array.isArray(binding) && binding.length === 1 && binding[0]?.HostIp === "127.0.0.1" &&
        /^[1-9][0-9]{0,4}$/.test(binding[0]?.HostPort ?? "") && Number(binding[0]!.HostPort) <= 65535
      if (
        name !== `/${config.container}` || image !== "universalrobots/ursim_e-series:5.17.3" ||
        running !== "true" || imageID !== approvedImageID ||
        !loopbackPort(noVnc) || (noVnc as Array<{ HostIp: string; HostPort: string }>)[0]!.HostPort !== config.hostPort
      ) throw new Error("is not the approved running URSim 5.17.3 container with approved loopback noVNC and VNC endpoints")
      return deriveLoopbackVncPort(ports)
    } catch (error) {
      if (error instanceof StageError) throw error
      throw stageError("simulator", `${target} ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const acquire = async <T>(promise: Promise<T>, close: (resource: T) => Promise<unknown>, operation: Operation) => {
    void promise.then((resource) => {
      if (disposed || operation.signal.aborted) void close(resource).catch(() => {})
    }, () => {})
    const resource = await operation.race(promise)
    if (disposed || operation.signal.aborted) {
      void close(resource).catch(() => {})
      operation.throwIfAborted()
      throw new Error("PolyScope vision plugin is disposed")
    }
    return resource
  }

  const ensureContext = async (deadline: number, operation: Operation) => {
    operation.throwIfAborted()
    if (!browser || !browser.isConnected()) {
      await quarantineBrowser(deadline)
      operation.throwIfAborted()
      const launched = await acquire(
        chromium.launch({ headless: true, timeout: timeoutFor(deadline) }),
        (resource) => resource.close(),
        operation,
      )
      try {
        operation.throwIfAborted()
        browser = launched
      } catch (error) {
        void launched.close().catch(() => {})
        throw error
      }
    }
    if (context) return context

    const currentBrowser = browser
    const created = await acquire(
      currentBrowser.newContext({ viewport: { width: 1280, height: 720 } }),
      (resource) => resource.close(),
      operation,
    )
    if (operation.signal.aborted || disposed || browser !== currentBrowser || !currentBrowser.isConnected()) {
      void created.close().catch(() => {})
      operation.throwIfAborted()
      throw new Error("PolyScope browser changed while creating a context")
    }
    context = created
    return created
  }

  const attachPageEvents = (current: PageSession) => {
    const liveSocket = (socket: WebSocket) => !current.stale && current.socket === socket
    current.page.on("close", () => {
      current.stale = true
      markStale(current)
    })
    current.page.on("crash", () => {
      current.stale = true
      markStale(current)
    })
    current.page.on("websocket", (socket) => {
      if (!isNoVncSocket(socket.url(), current.target) || current.stale) return
      if (current.socket && current.socket !== socket) {
        current.stale = true
        markStale(current)
        return
      }
      current.socket = socket
      current.socketGeneration = ++socketGeneration
      current.receivedSequence = 0
      current.sentSequence = 0
      current.clientMessages = new RfbClientMessageStream()
      current.completedDisplaySequence = 0
      socket.on("framereceived", () => {
        if (liveSocket(socket)) current.receivedSequence++
      })
      socket.on("framesent", (event) => {
        if (!liveSocket(socket)) return
        current.sentSequence++
        current.clientMessages.push(event.payload)
      })
      socket.on("close", () => {
        if (!liveSocket(socket)) return
        current.stale = true
        markStale(current)
      })
      socket.on("socketerror", () => {
        if (!liveSocket(socket)) return
        current.stale = true
        markStale(current)
      })
    })
  }

  const installRenderTracker = async (current: Page, target: TargetName, operation: Operation) => {
    operation.throwIfAborted()
    await operation.race(current.addInitScript(({ key, methods, expectedHost, displayModulePath, displayMarkerKey }) => {
      const root = globalThis as unknown as Record<string, unknown>
      if (root[key]) return
      const tracker = {
        generation: 0,
        consumedFrames: 0,
        socketGeneration: 0,
        displayStatus: "loading",
        displayError: "",
        displayInstance: undefined as object | undefined,
        displayPrototype: undefined as Record<PropertyKey, unknown> | undefined,
        displayPending: undefined as ((...args: unknown[]) => unknown) | undefined,
        displayFlush: undefined as ((...args: unknown[]) => unknown) | undefined,
      }
      Object.defineProperty(root, key, { value: tracker, configurable: false, writable: false })

      type Tracker = typeof tracker
      type DisplayWrapperState = {
        trackers: Set<Tracker>
        pending: (...args: unknown[]) => unknown
        flush: (...args: unknown[]) => unknown
      }
      const captureDisplay = (tracked: Tracker, instance: object) => {
        if (tracked.displayInstance && tracked.displayInstance !== instance) {
          tracked.displayStatus = "error"
          tracked.displayError = "multiple noVNC Display instances were observed in one page"
          return
        }
        tracked.displayInstance = instance
      }
      void (async () => {
        const moduleURL = new URL(displayModulePath, location.origin)
        if (moduleURL.origin !== location.origin || moduleURL.pathname !== displayModulePath) {
          throw new Error("pinned noVNC Display module URL is not exact and same-origin")
        }
        const imported = await import(moduleURL.href) as { default?: { prototype?: Record<PropertyKey, unknown> } }
        const prototype = imported.default?.prototype
        if (!prototype || typeof prototype.pending !== "function" || typeof prototype.flush !== "function") {
          throw new Error("pinned noVNC Display module methods are incompatible")
        }
        const marker = Symbol.for(displayMarkerKey)
        let wrappers = prototype[marker] as DisplayWrapperState | undefined
        if (wrappers) {
          if (prototype.pending !== wrappers.pending || prototype.flush !== wrappers.flush) {
            throw new Error("pinned noVNC Display prototype changed after wrapping")
          }
          wrappers.trackers.add(tracker)
        } else {
          const originalPending = prototype.pending as (...args: unknown[]) => unknown
          const originalFlush = prototype.flush as (...args: unknown[]) => unknown
          const trackers = new Set<Tracker>([tracker])
          const pending = function (this: object, ...args: unknown[]) {
            for (const tracked of trackers) captureDisplay(tracked, this)
            return Reflect.apply(originalPending, this, args)
          }
          const flush = function (this: object, ...args: unknown[]) {
            for (const tracked of trackers) captureDisplay(tracked, this)
            return Reflect.apply(originalFlush, this, args)
          }
          wrappers = { trackers, pending, flush }
          Object.defineProperty(prototype, marker, { value: wrappers, configurable: false, writable: false })
          prototype.pending = pending
          prototype.flush = flush
        }
        tracker.displayPrototype = prototype
        tracker.displayPending = wrappers.pending
        tracker.displayFlush = wrappers.flush
        tracker.displayStatus = "ready"
      })().catch((error) => {
        tracker.displayStatus = "error"
        tracker.displayError = error instanceof Error ? error.message : String(error)
      })

      const NativeWebSocket = globalThis.WebSocket
      const TrackedWebSocket = new Proxy(NativeWebSocket, {
        construct(constructor, args, newTarget) {
          const socket = Reflect.construct(constructor, args, newTarget) as { addEventListener(type: "message", listener: () => void): void }
          try {
            const url = new URL(String(args[0]), location.href)
            if (url.host === expectedHost && (url.pathname === "/websockify" || url.pathname.startsWith("/websockify/"))) {
              tracker.socketGeneration++
              tracker.consumedFrames = 0
              socket.addEventListener("message", () => { tracker.consumedFrames++ })
            }
          } catch {
            // The approved noVNC socket validation in Node remains authoritative.
          }
          return socket
        },
      })
      Object.defineProperty(root, "WebSocket", { value: TrackedWebSocket, configurable: true, writable: true })
      const prototype = CanvasRenderingContext2D.prototype as unknown as Record<string, (...args: unknown[]) => unknown>
      for (const method of methods) {
        const original = prototype[method]
        if (typeof original !== "function") continue
        prototype[method] = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
          const result = Reflect.apply(original, this, args)
          const firstCanvas = document.querySelector("canvas")
          if (this.canvas.id === "noVNC_canvas" || this.canvas === firstCanvas) tracker.generation++
          return result
        }
      }
    }, {
      key: renderTrackerKey,
      methods: ["clearRect", "drawImage", "fillRect", "putImageData"],
      expectedHost: new URL(targets[target].url).host,
      displayModulePath: "/core/display.js",
      displayMarkerKey: "__granforgePolyscopeDisplayPrototype",
    }))
    operation.throwIfAborted()
  }

  const renderGenerationOf = async (current: PageSession, operation: Operation) => {
    operation.throwIfAborted()
    const generation = await operation.race(current.page.evaluate((key) => {
      const tracker = (globalThis as unknown as Record<string, unknown>)[key] as { generation?: unknown } | undefined
      return tracker?.generation
    }, renderTrackerKey))
    operation.throwIfAborted()
    if (!Number.isSafeInteger(generation) || Number(generation) < 0) throw new Error("PolyScope canvas render tracker is unavailable")
    return Number(generation)
  }

  const exactRenderContinuity = (
    current: PageSession,
    socket: WebSocket,
    currentSocketGeneration: number,
    receivedSequence: number,
  ) => session === current &&
    !current.stale &&
    current.socket === socket &&
    current.socketGeneration === currentSocketGeneration &&
    current.receivedSequence === receivedSequence

  const completeDisplayThrough = async (current: PageSession, deadline: number, operation: Operation) => {
    while (remaining(deadline) > 0) {
      operation.throwIfAborted()
      const socket = current.socket
      const currentSocketGeneration = current.socketGeneration
      if (!socket || currentSocketGeneration === undefined) throw new Error("PolyScope noVNC socket is unavailable")
      const receivedSequence = current.receivedSequence
      let completed: { consumedFrames: number; renderGeneration: number }
      try {
        operation.throwIfAborted()
        completed = await operation.race(current.page.evaluate(async ({ key, watermark, kind }) => {
          if (kind !== "displayFlush") throw new Error("invalid display completion request")
          const root = globalThis as unknown as Record<string, unknown>
          const tracker = root[key] as {
            generation?: unknown
            consumedFrames?: unknown
            socketGeneration?: unknown
            displayStatus?: unknown
            displayError?: unknown
            displayInstance?: unknown
            displayPrototype?: unknown
            displayPending?: unknown
            displayFlush?: unknown
          } | undefined
          const canvas = document.querySelector("canvas")
          const yieldTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
          while (tracker?.displayStatus === "loading") await yieldTask()
          if (tracker?.displayStatus === "error") throw new Error(String(tracker.displayError || "pinned noVNC Display module capture failed"))
          if (
            !tracker || !Number.isSafeInteger(tracker.consumedFrames) || !Number.isSafeInteger(tracker.generation) ||
            !Number.isSafeInteger(tracker.socketGeneration) || Number(tracker.socketGeneration) < 1
          ) throw new Error("pinned noVNC frame-consumption tracker is unavailable")
          while (Number(tracker.consumedFrames) < watermark) await yieldTask()
          if (!tracker.displayInstance) throw new Error("no matching noVNC Display invocation was observed after frame consumption")
          const display = tracker?.displayInstance as { _target?: unknown; pending?: unknown; flush?: unknown } | undefined
          const prototype = display ? Object.getPrototypeOf(display) as Record<PropertyKey, unknown> : undefined
          if (
            !canvas || display?._target !== canvas || prototype !== tracker.displayPrototype ||
            typeof display.pending !== "function" || typeof display.flush !== "function" ||
            display.pending !== tracker.displayPending || display.flush !== tracker.displayFlush
          ) throw new Error("pinned noVNC Display module instance pending()/flush() contract is unavailable")

          ;(display.flush as () => void).call(display)
          while ((display.pending as () => boolean).call(display)) await yieldTask()
          return { consumedFrames: Number(tracker.consumedFrames), renderGeneration: Number(tracker.generation) }
        }, { key: renderTrackerKey, watermark: receivedSequence, kind: "displayFlush" }))
      } catch (error) {
        if (error instanceof StageError) throw error
        throw stageError("canvas", `Pinned noVNC display completion failed: ${error instanceof Error ? error.message : String(error)}`)
      }
      operation.throwIfAborted()
      if (!exactRenderContinuity(current, socket, currentSocketGeneration, receivedSequence)) continue
      if (
        !Number.isSafeInteger(completed.consumedFrames) ||
        !Number.isSafeInteger(completed.renderGeneration) ||
        completed.consumedFrames < receivedSequence ||
        completed.renderGeneration < 0
      ) throw stageError("canvas", "Pinned noVNC display completion returned an invalid watermark")
      if (completed.consumedFrames !== receivedSequence) {
        await operation.race(pause(0))
        continue
      }
      current.completedDisplaySequence = Math.max(current.completedDisplaySequence, receivedSequence)
      if (current.completedDisplaySequence < current.receivedSequence) continue
      return {
        socket,
        socketGeneration: currentSocketGeneration,
        receivedSequence,
        completedDisplaySequence: current.completedDisplaySequence,
        renderGeneration: completed.renderGeneration,
      }
    }
    throw stageError("deadline", "PolyScope display did not complete received frames before the operation deadline")
  }

  const stableCanvas = async (current: PageSession, deadline: number, operation: Operation): Promise<StableCanvas> => {
    const canvas = current.page.locator("canvas").first()
    while (remaining(deadline) > 0) {
      const before = await completeDisplayThrough(current, deadline, operation)
      operation.throwIfAborted()
      const firstBox = await operation.race(canvas.boundingBox({ timeout: timeoutFor(deadline) }))
      if (!firstBox || firstBox.width < 1 || firstBox.height < 1) throw new Error("PolyScope canvas is not visible")
      operation.throwIfAborted()
      const firstPng = await operation.race(canvas.screenshot({ type: "png", timeout: timeoutFor(deadline) }))
      operation.throwIfAborted()
      const firstDimensions = await operation.race(canvas.evaluate((element, marker) => {
        if (marker !== "dimensions" || !(element instanceof HTMLCanvasElement)) throw new Error("PolyScope canvas dimensions are unavailable")
        return { width: element.width, height: element.height }
      }, "dimensions", { timeout: timeoutFor(deadline) }))

      const after = await completeDisplayThrough(current, deadline, operation)
      if (
        after.socket !== before.socket ||
        after.socketGeneration !== before.socketGeneration ||
        after.receivedSequence !== before.receivedSequence ||
        after.completedDisplaySequence !== before.completedDisplaySequence ||
        after.renderGeneration !== before.renderGeneration
      ) continue

      operation.throwIfAborted()
      const finalBox = await operation.race(canvas.boundingBox({ timeout: timeoutFor(deadline) }))
      operation.throwIfAborted()
      const finalPng = await operation.race(canvas.screenshot({ type: "png", timeout: timeoutFor(deadline) }))
      operation.throwIfAborted()
      const finalDimensions = await operation.race(canvas.evaluate((element, marker) => {
        if (marker !== "dimensions" || !(element instanceof HTMLCanvasElement)) throw new Error("PolyScope canvas dimensions are unavailable")
        return { width: element.width, height: element.height }
      }, "dimensions", { timeout: timeoutFor(deadline) }))
      const finalRenderGeneration = await renderGenerationOf(current, operation)
      const firstHash = createHash("sha256").update(firstPng).digest("hex")
      const finalHash = createHash("sha256").update(finalPng).digest("hex")
      if (
        !finalBox ||
        !sameBox(firstBox, finalBox) ||
        firstDimensions.width !== finalDimensions.width ||
        firstDimensions.height !== finalDimensions.height ||
        finalDimensions.width < 1 ||
        finalDimensions.height < 1 ||
        firstHash !== finalHash ||
        finalRenderGeneration !== before.renderGeneration ||
        !exactRenderContinuity(current, before.socket, before.socketGeneration, before.receivedSequence)
      ) continue

      return {
        box: finalBox,
        png: finalPng,
        contentHash: finalHash,
        canvasWidth: finalDimensions.width,
        canvasHeight: finalDimensions.height,
        ...before,
      }
    }
    throw stageError("deadline", "PolyScope canvas pixels did not become stable before the operation deadline")
  }

  const createPage = async (target: TargetName, deadline: number, operation: Operation) => {
    const currentContext = await ensureContext(deadline, operation)
    operation.throwIfAborted()
    const next = await acquire(currentContext.newPage(), (resource) => resource.close(), operation)
    const candidate: PageSession = {
      page: next,
      target,
      generation: ++pageGeneration,
      stale: false,
      receivedSequence: 0,
      sentSequence: 0,
      clientMessages: new RfbClientMessageStream(),
      completedDisplaySequence: 0,
    }
    attachPageEvents(candidate)

    try {
      await installRenderTracker(next, target, operation)
      operation.throwIfAborted()
      await operation.race(next.goto(targets[target].url, {
        waitUntil: "domcontentloaded",
        timeout: timeoutFor(deadline, 10_000),
      }))
      operation.throwIfAborted()
      await operation.race(next.waitForFunction(() => {
        const canvas = document.querySelector("canvas")
        return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0
      }, undefined, { timeout: timeoutFor(deadline, 8_000) }))
      operation.throwIfAborted()

      if (disposed || candidate.stale || next.isClosed() || context !== currentContext) {
        throw new Error("PolyScope page became unavailable during navigation")
      }
      session = candidate
      invalidateScreenshot()
      return candidate
    } catch (error) {
      candidate.stale = true
      if (session === candidate) session = undefined
      void next.close().catch(() => {})
      throw error
    }
  }

  const open = async (target: TargetName, deadline: number, operation: Operation) => {
    if (disposed) throw new Error("PolyScope vision plugin is disposed")
    if (session && !session.page.isClosed() && browser?.isConnected() && !session.stale && session.target === target) return session

    await discardPage(deadline)
    operation.throwIfAborted()
    return createPage(target, deadline, operation)
  }

  const canvasState = async (current: Page, deadline: number) => {
    timeoutFor(deadline)
    const state = await current.locator("canvas").first().evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) return { ready: false, readable: false, black: true, connected: false, unavailable: false }
    const canvas = element

    const rect = canvas.getBoundingClientRect()
    if (canvas.width < 1 || canvas.height < 1 || rect.width < 1 || rect.height < 1) {
      return { ready: false, readable: false, black: true, connected: false, unavailable: false }
    }

    const status = document.querySelector("#noVNC_status")?.textContent ?? ""
    const unavailable = /(?:disconnect|failed|error)/i.test(status)
    const connected = status.trim().length === 0 || /connected/i.test(status)
    let readable = false
    let black = true
    try {
      const context = canvas.getContext("2d")
      if (context) {
        readable = true
        black = true
        const columns = Math.min(32, canvas.width)
        const rows = Math.min(32, canvas.height)
        for (let row = 0; row < rows && black; row++) {
          for (let column = 0; column < columns; column++) {
            const x = Math.floor((column * (canvas.width - 1)) / Math.max(columns - 1, 1))
            const y = Math.floor((row * (canvas.height - 1)) / Math.max(rows - 1, 1))
            const pixel = context.getImageData(x, y, 1, 1).data
            if (pixel[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0) {
              black = false
              break
            }
          }
        }
      }
    } catch {
      // A non-readable framebuffer is never click-eligible.
    }

    return {
      ready: true,
      readable,
      black,
      connected,
      unavailable,
    }
    }, undefined, { timeout: timeoutFor(deadline, 1_000) })
    timeoutFor(deadline)
    return state
  }

  const ensureCanvasReady = async (current: PageSession, deadline: number, operation: Operation) => {
    const blackDeadline = Math.min(deadline, Date.now() + blackFrameGraceMs)
    let lastProblem = "PolyScope canvas is not visible"

    while (remaining(deadline) > 0) {
      operation.throwIfAborted()
      const state = await operation.race(canvasState(current.page, deadline))
      const socketIsLive = Boolean(current.socket && current.socketGeneration && !current.stale)
      const hasFrame = current.receivedSequence > 0
      if (state.ready && state.readable && !state.black && state.connected && !state.unavailable && socketIsLive && hasFrame) return

      if (state.unavailable) lastProblem = "PolyScope reports that noVNC is disconnected"
      else if (!state.connected) lastProblem = "PolyScope noVNC status is not connected"
      else if (!socketIsLive || !hasFrame) lastProblem = "PolyScope is waiting for a live matching noVNC frame"
      else if ((!state.readable || state.black) && Date.now() >= blackDeadline) lastProblem = "PolyScope canvas is persistently black or unreadable"

      if ((!state.readable || state.black) && Date.now() >= blackDeadline) break
      const delay = Math.min(250, remaining(deadline))
      if (delay <= 0) break
      await operation.race(pause(delay))
    }
    throw new Error(lastProblem)
  }

  const captureCurrent = async (target: TargetName, current: PageSession, deadline: number, operation: Operation): Promise<ToolResult> => {
    if (session !== current || current.stale || current.target !== target) throw new Error("PolyScope page is stale")

    await ensureCanvasReady(current, deadline, operation)
    const stable = await stableCanvas(current, deadline, operation)
    const { box, png } = stable

    if (latestScreenshot && (!sameBox(latestScreenshot.box, box) || latestScreenshot.target !== target || latestScreenshot.generation !== current.generation)) {
      invalidateScreenshot()
    }

    const { width: imageWidth, height: imageHeight } = pngDimensions(png)
    operation.throwIfAborted()
    if (!exactRenderContinuity(current, stable.socket, stable.socketGeneration, stable.receivedSequence)) throw new Error("PolyScope page became unavailable during capture")

    latestScreenshot = {
      id: randomUUID(),
      target,
      generation: current.generation,
      box,
      imageWidth,
      imageHeight,
      contentHash: stable.contentHash,
      socket: stable.socket,
      socketGeneration: stable.socketGeneration,
      receivedSequence: stable.receivedSequence,
      sentSequence: current.sentSequence,
      renderGeneration: stable.renderGeneration,
      canvasWidth: stable.canvasWidth,
      canvasHeight: stable.canvasHeight,
      completedDisplaySequence: stable.completedDisplaySequence,
    }
    const metadata = {
      id: latestScreenshot.id,
      target: latestScreenshot.target,
      generation: latestScreenshot.generation,
      box: latestScreenshot.box,
      imageWidth: latestScreenshot.imageWidth,
      imageHeight: latestScreenshot.imageHeight,
      contentHash: latestScreenshot.contentHash,
      socketGeneration: latestScreenshot.socketGeneration,
      receivedSequence: latestScreenshot.receivedSequence,
      sentSequence: latestScreenshot.sentSequence,
      renderGeneration: latestScreenshot.renderGeneration,
      canvasWidth: latestScreenshot.canvasWidth,
      canvasHeight: latestScreenshot.canvasHeight,
      completedDisplaySequence: latestScreenshot.completedDisplaySequence,
    }
    return {
      title: `PolyScope ${target} screenshot`,
      output: `Approved local URSim ${target}. Screenshot ID: ${latestScreenshot.id}. Image coordinates: ${latestScreenshot.imageWidth}x${latestScreenshot.imageHeight}.`,
      metadata,
      attachments: [{ type: "file", mime: "image/png", url: `data:image/png;base64,${png.toString("base64")}`, filename: `polyscope-${target}.png` }],
    }
  }

  const capture = async (target: TargetName, deadline: number, current: Operation): Promise<ToolResult> => {
    current.throwIfAborted()
    const rfbPort = await verifySimulator(target, deadline, current)
    await rfbPreflight(rfbPort, deadline, current.signal)
    const diagnostics: string[] = []
    for (let attempt = 0; attempt < recoveryAttempts; attempt++) {
      current.throwIfAborted()
      try {
        return await captureCurrent(target, await open(target, deadline, current), deadline, current)
      } catch (error) {
        current.throwIfAborted()
        if (error instanceof StageError && error.stage === "canvas") throw error
        const detail = error instanceof Error ? error.message : String(error)
        diagnostics.push(`browser attempt ${attempt + 1}: ${detail}`)
        if (session) markStale(session)
        await quarantineBrowser(deadline)
        if (attempt + 1 >= recoveryAttempts || remaining(deadline) <= 0) break
      }
    }
    throw stageError("browser", `PolyScope ${target} failed; ${diagnostics.join("; ")}`)
  }


  const requireCurrentCapture = (screenshot: Screenshot) => {
    const current = session
    if (
      latestScreenshot?.id !== screenshot.id ||
      !current ||
      current.page.isClosed() ||
      !browser?.isConnected() ||
      current.stale ||
      current.target !== screenshot.target ||
      current.generation !== screenshot.generation ||
      current.socket !== screenshot.socket ||
      current.socketGeneration !== screenshot.socketGeneration
    ) {
      invalidateScreenshot()
      throw new Error("Screenshot is stale; capture a new screenshot before clicking")
    }
    return current
  }

  return {
    tool: {
      polyscope_open: tool({
        description: "Open an approved local URSim 5.17.3 PolyScope noVNC session and return a screenshot of its canvas. The returned image may be inspected to choose coordinates for polyscope_click. This tool cannot connect to physical or remote robots.",
        args: { target: tool.schema.enum(["gate1", "gate2"]).default("gate2") },
        execute: async ({ target }, context) => enqueue(context.abort, (deadline, current) => capture(target, deadline, current)),
      }),
      polyscope_screenshot: tool({
        description: "Capture the current approved local URSim PolyScope canvas. Inspect the returned image and use its screenshot ID and pixel coordinates with polyscope_click. Re-capture whenever the UI may have changed.",
        args: { target: tool.schema.enum(["gate1", "gate2"]).default("gate2") },
        execute: async ({ target }, context) => enqueue(context.abort, (deadline, current) => capture(target, deadline, current)),
      }),
      polyscope_reset: tool({
        description: "Discard the current approved local URSim PolyScope noVNC page, reconnect to the selected target, and return a fresh screenshot. This invalidates all earlier screenshot IDs.",
        args: { target: tool.schema.enum(["gate1", "gate2"]).default("gate2") },
        execute: async ({ target }, context) => enqueue(context.abort, async (deadline, current) => {
          if (disposed) throw new Error("PolyScope vision plugin is disposed")
          invalidateScreenshot()
          await quarantineBrowser(deadline)
          return capture(target, deadline, current)
        }),
      }),
      polyscope_click: tool({
        description: "Click pixel coordinates selected from a polyscope_open or polyscope_screenshot image. Requires the exact latest screenshot ID, rejects stale or out-of-bounds coordinates, and returns a new screenshot for visual verification. It is hard-limited to approved local URSim 5.17.3 containers.",
        args: {
          screenshotID: tool.schema.string().min(1), x: tool.schema.number().int().nonnegative(), y: tool.schema.number().int().nonnegative(),
          clicks: tool.schema.union([tool.schema.literal(1), tool.schema.literal(2)]).default(1),
        },
        execute: async ({ screenshotID, x, y, clicks }, context) => enqueue(context.abort, async (clickDeadline, operation) => {
          if (disposed) throw new Error("PolyScope vision plugin is disposed")
          const screenshot = latestScreenshot
          if (!screenshot || screenshot.id !== screenshotID) throw new Error("Screenshot is missing or stale; capture a new screenshot before clicking")
          if (x >= screenshot.imageWidth || y >= screenshot.imageHeight) throw new Error(`Coordinates must be within ${screenshot.imageWidth}x${screenshot.imageHeight}`)
          // Do not call open() here: a stale click must never cause recovery
          // followed by a replay against a page the operator did not inspect.
          let current = requireCurrentCapture(screenshot)
          const rfbPort = await verifySimulator(screenshot.target, clickDeadline, operation)
          await rfbPreflight(rfbPort, clickDeadline, operation.signal)
          operation.throwIfAborted()
          current = requireCurrentCapture(screenshot)

          let stable: StableCanvas
          try {
            stable = await stableCanvas(current, clickDeadline, operation)
          } catch (error) {
            if (error instanceof StageError) throw error
            markStale(current)
            throw new Error("Screenshot is stale; capture a new screenshot before clicking")
          }
          current = requireCurrentCapture(screenshot)
          if (
            stable.contentHash !== screenshot.contentHash ||
            stable.socket !== screenshot.socket ||
            stable.socketGeneration !== screenshot.socketGeneration ||
            stable.receivedSequence !== screenshot.receivedSequence ||
            stable.completedDisplaySequence < stable.receivedSequence ||
            screenshot.completedDisplaySequence < screenshot.receivedSequence ||
            stable.renderGeneration !== screenshot.renderGeneration
          ) {
            invalidateScreenshot()
            throw new Error("Screenshot content, render, or noVNC frame continuity changed; capture a new screenshot before clicking")
          }
          if (
            !sameBox(screenshot.box, stable.box) ||
            stable.canvasWidth !== screenshot.canvasWidth ||
            stable.canvasHeight !== screenshot.canvasHeight
          ) {
            invalidateScreenshot()
            throw new Error("Canvas geometry or framebuffer dimensions changed; capture a new screenshot before clicking")
          }

          const dispatchedSession = current
          const receivedBeforeDispatch = current.receivedSequence
          const renderBeforeDispatch = stable.renderGeneration
          const pointerStart = current.clientMessages.pointerCount
          const malformedStart = current.clientMessages.malformedRevision
          if (current.clientMessages.bufferedLength !== 0) {
            invalidateScreenshot()
            throw new Error("Outbound RFB stream is between messages; capture a new screenshot before clicking")
          }
          const expectedX = Math.min(stable.canvasWidth - 1, Math.floor((x / screenshot.imageWidth) * stable.canvasWidth))
          const expectedY = Math.min(stable.canvasHeight - 1, Math.floor((y / screenshot.imageHeight) * stable.canvasHeight))
          if (expectedX > 0xffff || expectedY > 0xffff) throw new Error("PolyScope framebuffer exceeds RFB pointer coordinate limits")
          const expectedPointers: RfbPointerEvent[] = []
          for (let click = 0; click < clicks; click++) {
            expectedPointers.push(
              { buttonMask: 1, x: expectedX, y: expectedY },
              { buttonMask: 0, x: expectedX, y: expectedY },
            )
          }
          const canvas = current.page.locator("canvas").first()
          operation.throwIfAborted()
          invalidateScreenshot()

          const continuityIsExact = () => session === dispatchedSession &&
            !dispatchedSession.stale &&
            dispatchedSession.target === screenshot.target &&
            dispatchedSession.generation === screenshot.generation &&
            dispatchedSession.socket === screenshot.socket &&
            dispatchedSession.socketGeneration === screenshot.socketGeneration

          try {
            operation.commit()
            await operation.race(canvas.click({
              position: {
                x: (x / screenshot.imageWidth) * stable.box.width,
                y: (y / screenshot.imageHeight) * stable.box.height,
              },
              clickCount: clicks,
              timeout: timeoutFor(clickDeadline),
            }))
            const renderAfterDispatch = await renderGenerationOf(dispatchedSession, operation)
            if (
              !continuityIsExact() ||
              dispatchedSession.receivedSequence !== receivedBeforeDispatch ||
              renderAfterDispatch !== renderBeforeDispatch
            ) {
              throw stageError("indeterminate-click", "An inbound noVNC frame, canvas render, or continuity change raced click dispatch")
            }

            let quietStartedAt: number | undefined
            let quietSentSequence = dispatchedSession.sentSequence
            while (true) {
              operation.throwIfAborted()
              if (!continuityIsExact()) throw stageError("indeterminate-click", "noVNC continuity was lost after click dispatch")
              if (dispatchedSession.clientMessages.malformedRevision !== malformedStart) {
                throw stageError("indeterminate-click", "Malformed outbound RFB data followed click dispatch")
              }
              const pointerEvents = dispatchedSession.clientMessages.pointerEventsSince(pointerStart)
              if (!pointerEvents) throw stageError("indeterminate-click", "Outbound RFB pointer history was lost after click dispatch")
              const status = pointerHistoryStatus(pointerEvents, expectedPointers)
              if (status === "invalid") {
                throw stageError("indeterminate-click", "Outbound RFB pointer events did not match the requested click")
              }
              const bufferedLength = dispatchedSession.clientMessages.bufferedLength
              if (status === "exact" && bufferedLength === 0) {
                if (quietStartedAt === undefined || quietSentSequence !== dispatchedSession.sentSequence) {
                  quietStartedAt = Date.now()
                  quietSentSequence = dispatchedSession.sentSequence
                } else if (Date.now() - quietStartedAt >= outboundQuietMs) {
                  break
                }
              } else {
                quietStartedAt = undefined
              }
              const wait = Math.min(10, remaining(clickDeadline))
              if (wait <= 0) {
                const detail = bufferedLength > 0 ? "an outbound RFB message remained partial" : "the exact outbound RFB pointer sequence was not observed"
                throw stageError("indeterminate-click", `Click confirmation failed before the deadline because ${detail}`)
              }
              await operation.race(pause(wait))
            }

            operation.throwIfAborted()
            if (!continuityIsExact()) throw stageError("indeterminate-click", "noVNC continuity was lost after click dispatch")
            return await captureCurrent(screenshot.target, dispatchedSession, clickDeadline, operation)
          } catch (error) {
            markStale(dispatchedSession)
            if (error instanceof StageError && error.stage === "indeterminate-click") throw error
            throw stageError("indeterminate-click", `Click was dispatched but post-click capture could not confirm state: ${error instanceof Error ? error.message : String(error)}`)
          }
        }),
      }),
    },
    dispose: async () => { disposed = true; await controller.dispose(); await quarantineBrowser(Date.now() + 1_000) },
  }
}) satisfies Plugin
