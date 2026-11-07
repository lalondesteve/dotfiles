import { describe, expect, test } from "bun:test"
import { chmod, mkdtemp, readdir, rm, writeFile } from "node:fs/promises"
import { createServer as createHttpServer } from "node:http"
import { EventEmitter } from "node:events"
import { createServer } from "node:net"
import { dirname, join } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath, pathToFileURL } from "node:url"
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core"
import { createController, deriveLoopbackVncPort, rfbPreflight } from "../lib/granforge-polyscope-vision-core"

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const withFakeDocker = async <T>(rfbPort: number, work: () => Promise<T>) => {
  const directory = await mkdtemp(join(tmpdir(), "polyscope-docker-"))
  const executable = join(directory, "docker")
  const ports = JSON.stringify({
    "6080/tcp": [{ HostIp: "127.0.0.1", HostPort: "6081" }],
    "5900/tcp": [{ HostIp: "127.0.0.1", HostPort: String(rfbPort) }],
  })
  const output = `/granforge-urcap-gate2|universalrobots/ursim_e-series:5.17.3|true|sha256:a09bbbe59e27ca1a1badab77eb3eed0000c1fa82dac3b66e650a060b62f83ad7|${ports}`
  await writeFile(executable, `#!/bin/sh\nprintf '%s\\n' '${output}'\n`)
  await chmod(executable, 0o700)
  const originalPath = process.env.PATH
  process.env.PATH = `${directory}:${originalPath ?? ""}`
  try {
    return await work()
  } finally {
    process.env.PATH = originalPath
    await rm(directory, { recursive: true, force: true })
  }
}

const exactRfbServer = async () => {
  const server = createServer((socket) => socket.end("RFB 003.008\n"))
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  return {
    port: (server.address() as { port: number }).port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

const healthyGate2Http = async () => {
  const server = createHttpServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" })
    response.end("<!doctype html><canvas></canvas>")
  })
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(6081, "127.0.0.1", resolve)
    })
    return () => new Promise<void>((resolve) => server.close(() => resolve()))
  } catch (error) {
    server.close()
    if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error
    const response = await fetch("http://127.0.0.1:6081/vnc.html")
    if (!response.ok) throw new Error(`existing gate2 HTTP endpoint returned ${response.status}`)
    return async () => {}
  }
}

const screenshotPng = (revision = 0) => {
  const png = Buffer.alloc(25)
  Buffer.from([0x89, 0x50, 0x4e, 0x47]).copy(png)
  png.write("IHDR", 12, "ascii")
  png.writeUInt32BE(100, 16)
  png.writeUInt32BE(80, 20)
  png[24] = revision & 0xff
  return png
}

const metadataOf = (result: unknown) => {
  if (!result || typeof result !== "object" || !("metadata" in result) || !result.metadata || typeof result.metadata !== "object") {
    throw new Error("expected a structured tool result with metadata")
  }
  return result.metadata as Record<string, unknown>
}

class FakeWebSocket extends EventEmitter {
  constructor(private readonly onReceive: () => void = () => {}) { super() }
  url() { return "ws://127.0.0.1:6081/websockify" }
  receive() { this.onReceive(); this.emit("framereceived", { payload: Buffer.from([1]) }) }
  send(payload: Buffer = Buffer.from([1])) { this.emit("framesent", { payload }) }
}

const pointerEvent = (buttonMask: number, x: number, y: number) => Buffer.from([
  5,
  buttonMask,
  (x >>> 8) & 0xff,
  x & 0xff,
  (y >>> 8) & 0xff,
  y & 0xff,
])
const framebufferRequest = Buffer.from([3, 0, 0, 0, 0, 0, 0, 1, 0, 1])
const keyEvent = Buffer.from([4, 1, 0, 0, 0, 0, 0, 5])

type FakeClickOptions = { position: { x: number; y: number }; clickCount: number }

let fakePageGeneration = 0

class FakePage extends EventEmitter {
  readonly socket: FakeWebSocket
  closed = false
  clickCalls = 0
  failCanvas = false
  renderGeneration = 0
  pixelRevision = 0
  trackerInstalled = false
  readonly screenshotRevisions: number[] = []
  onGoto: () => void | Promise<void> = () => {}
  canvasWidth = 100
  canvasHeight = 80
  onClick: (options: FakeClickOptions) => void | Promise<void> = (options) => { this.sendPointerSequence(options) }
  readonly box = { x: 10, y: 20, width: 100, height: 80 }
  consumedFrames = 0
  displayCompatible = true
  displayFlushDelay = 0
  displayFlushes = 0
  onDisplayFlush: () => void | Promise<void> = () => {}
  readonly pageGeneration = ++fakePageGeneration
  displayImportRequested = false
  displayImportedPath: string | undefined
  displayImportFails = false
  displayTargetMatches = true
  displayMethodsMatch = true
  displayInstanceGeneration: number | undefined
  readonly globalUiDefined = false
  initScriptCallback: unknown
  initScriptArgument: unknown
  displayCompletionCallback: unknown
  displayCompletionArgument: unknown

  constructor() {
    super()
    this.socket = new FakeWebSocket(() => { this.consumedFrames++ })
  }

  async goto() {
    this.emit("websocket", this.socket)
    this.socket.receive()
    if (this.displayImportRequested && !this.displayImportFails) this.displayInstanceGeneration = this.pageGeneration
    await this.onGoto()
    return null
  }

  async addInitScript(_callback: unknown, argument?: unknown) {
    this.trackerInstalled = true
    this.initScriptCallback = _callback
    this.initScriptArgument = argument
    if (argument && typeof argument === "object" && "displayModulePath" in argument && argument.displayModulePath === "/core/display.js") {
      this.displayImportRequested = true
      this.displayImportedPath = String(argument.displayModulePath)
    }
  }
  async evaluate(_callback: unknown, argument?: unknown) {
    if (argument && typeof argument === "object" && "kind" in argument && argument.kind === "displayFlush") {
      this.displayCompletionCallback = _callback
      this.displayCompletionArgument = argument
      if (!this.displayCompatible) throw new Error("pinned noVNC Display API is unavailable")
      if (!this.displayImportRequested) throw new Error("pinned noVNC Display module was not imported")
      if (this.displayImportFails) throw new Error("pinned noVNC Display module import failed")
      if (this.displayInstanceGeneration !== this.pageGeneration) throw new Error("matching Display instance was not observed for this page")
      if (!this.displayTargetMatches) throw new Error("tracked Display target does not match the noVNC canvas")
      if (!this.displayMethodsMatch) throw new Error("tracked Display methods differ from the captured module prototype")
      this.displayFlushes++
      if (this.displayFlushDelay > 0) await new Promise((resolve) => setTimeout(resolve, this.displayFlushDelay))
      await this.onDisplayFlush()
      return { consumedFrames: this.consumedFrames, renderGeneration: this.renderGeneration }
    }
    if (argument && typeof argument === "object" && "quietMs" in argument) {
      await new Promise((resolve) => setTimeout(resolve, Number(argument.quietMs)))
    }
    return this.renderGeneration
  }
  paint() { this.renderGeneration++; this.pixelRevision++ }
  sendPointerSequence(options: FakeClickOptions) {
    const x = Math.floor((options.position.x / this.box.width) * this.canvasWidth)
    const y = Math.floor((options.position.y / this.box.height) * this.canvasHeight)
    const messages: Buffer[] = []
    for (let click = 0; click < options.clickCount; click++) messages.push(pointerEvent(1, x, y), pointerEvent(0, x, y))
    this.socket.send(Buffer.concat(messages))
  }
  async waitForFunction() {}
  isClosed() { return this.closed }
  async close() {
    if (this.closed) return
    this.closed = true
    this.emit("close")
  }

  locator() {
    const page = this
    const locator = {
      first: () => locator,
      evaluate: async (_callback: unknown, argument?: unknown) => {
        if (argument === "dimensions") return { width: page.canvasWidth, height: page.canvasHeight }
        if (page.failCanvas) throw new Error("canvas failed")
        return { ready: true, readable: true, black: false, connected: true, unavailable: false }
      },
      boundingBox: async () => ({ ...page.box }),
      screenshot: async () => {
        page.screenshotRevisions.push(page.pixelRevision)
        return screenshotPng(page.pixelRevision)
      },
      click: async (options: FakeClickOptions) => {
        page.clickCalls++
        await page.onClick(options)
      },
    }
    return locator
  }
}

class FakeContext {
  constructor(readonly page: FakePage) {}
  async newPage() { return this.page as unknown as Page }
  async close() { await this.page.close() }
}

class FakeBrowser {
  connected = true
  constructor(readonly page: FakePage) {}
  isConnected() { return this.connected }
  async newContext() { return new FakeContext(this.page) as unknown as BrowserContext }
  async close() { this.connected = false; await this.page.close() }
}

type VisionHooks = Awaited<ReturnType<(typeof import("../plugins/granforge-polyscope-vision"))["default"]>>

const withProductionBrowser = async <T>(launch: () => Promise<Browser>, work: (hooks: VisionHooks) => Promise<T>) => {
  const rfb = await exactRfbServer()
  const mutableChromium = chromium as unknown as { launch: typeof chromium.launch }
  const originalLaunch = mutableChromium.launch
  mutableChromium.launch = launch as typeof chromium.launch
  try {
    return await withFakeDocker(rfb.port, async () => {
      const entry = await import("../plugins/granforge-polyscope-vision")
      const hooks = await entry.default({ directory: "/home/steve/granforge" } as never)
      try {
        return await work(hooks)
      } finally {
        if (hooks.dispose) await hooks.dispose()
      }
    })
  } finally {
    mutableChromium.launch = originalLaunch
    await rfb.close()
  }
}

test("the discovered plugin directory contains only valid plugin entries", async () => {
  const pluginDirectory = join(dirname(fileURLToPath(import.meta.url)), "../plugins")
  const entries = (await readdir(pluginDirectory)).filter((name) => /\.[tj]s$/.test(name)).sort()
  expect(entries).toEqual(["granforge-polyscope-vision.ts"])

  for (const entry of entries) {
    const exports = await import(pathToFileURL(join(pluginDirectory, entry)).href)
    expect(Object.keys(exports)).toEqual(["default"])
    expect(typeof exports.default).toBe("function")
  }
})

test("the production entry exposes the four guarded PolyScope tool paths", async () => {
  const entry = await import("../plugins/granforge-polyscope-vision")
  expect(Object.keys(entry)).toEqual(["default"])
  const hooks = await entry.default({ directory: "/home/steve/granforge" } as never)
  expect(Object.keys(hooks.tool ?? {}).sort()).toEqual([
    "polyscope_click",
    "polyscope_open",
    "polyscope_reset",
    "polyscope_screenshot",
  ])
  for (const definition of Object.values(hooks.tool ?? {})) expect(typeof definition.execute).toBe("function")
  if (hooks.dispose) await hooks.dispose()
})

test("active cancellation closes a browser that launches after the caller is settled", async () => {
  const rfb = await exactRfbServer()
  const launched = deferred<void>()
  const lateBrowser = deferred<Browser>()
  let closes = 0
  const fakeBrowser = {
    close: async () => { closes++ },
    isConnected: () => true,
  } as unknown as Browser
  const mutableChromium = chromium as unknown as { launch: typeof chromium.launch }
  const originalLaunch = mutableChromium.launch
  mutableChromium.launch = (() => {
    launched.resolve()
    return lateBrowser.promise
  }) as typeof chromium.launch

  try {
    await withFakeDocker(rfb.port, async () => {
      const entry = await import("../plugins/granforge-polyscope-vision")
      const hooks = await entry.default({ directory: "/home/steve/granforge" } as never)
      const abort = new AbortController()
      const result = hooks.tool!.polyscope_open.execute({ target: "gate2" }, { abort: abort.signal } as never)
      await launched.promise
      abort.abort()
      await expect(result).rejects.toThrow("cancelled")
      lateBrowser.resolve(fakeBrowser)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(closes).toBe(1)
      if (hooks.dispose) await hooks.dispose()
    })
  } finally {
    mutableChromium.launch = originalLaunch
    lateBrowser.resolve(fakeBrowser)
    await rfb.close()
  }
})

test("RFB silence times out before browser work even when gate2 HTTP is healthy", async () => {
  const closeHttp = await healthyGate2Http()
  const sockets = new Set<import("node:net").Socket>()
  const silentRfb = createServer((socket) => {
    sockets.add(socket)
    socket.once("close", () => sockets.delete(socket))
  })
  await new Promise<void>((resolve) => silentRfb.listen(0, "127.0.0.1", resolve))
  const rfbPort = (silentRfb.address() as { port: number }).port
  const mutableChromium = chromium as unknown as { launch: typeof chromium.launch }
  const originalLaunch = mutableChromium.launch
  let launches = 0
  mutableChromium.launch = (async () => {
    launches++
    throw new Error("browser must not launch before exact RFB preflight")
  }) as typeof chromium.launch

  try {
    await withFakeDocker(rfbPort, async () => {
      const entry = await import("../plugins/granforge-polyscope-vision")
      const hooks = await entry.default({ directory: "/home/steve/granforge" } as never)
      await expect(hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)).rejects.toThrow("rfb-preflight")
      expect(launches).toBe(0)
      if (hooks.dispose) await hooks.dispose()
    })
  } finally {
    mutableChromium.launch = originalLaunch
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => silentRfb.close(() => resolve()))
    await closeHttp()
  }
})

test("a received frame after capture prevents click dispatch", async () => {
  const page = new FakePage()
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    page.socket.receive()
    await expect(hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)).rejects.toThrow("frame continuity")
    expect(page.clickCalls).toBe(0)
  })
})

test("a frame received before delayed canvas paint cannot publish stale pixels", async () => {
  const page = new FakePage()
  page.displayFlushDelay = 25
  let painted = false
  page.onDisplayFlush = () => {
    if (painted) return
    painted = true
    page.paint()
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    expect(page.trackerInstalled).toBe(true)
    expect(page.screenshotRevisions).not.toContain(0)
    expect(metadataOf(opened).renderGeneration).toBe(1)
  })
})

test("pinned noVNC display flush beyond the old quiet interval gates screenshot pixels", async () => {
  const page = new FakePage()
  page.displayFlushDelay = 100
  let painted = false
  page.onDisplayFlush = () => {
    if (painted) return
    painted = true
    page.paint()
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    expect(page.displayFlushes).toBeGreaterThan(0)
    expect(page.screenshotRevisions).not.toContain(0)
    expect(metadataOf(opened).renderGeneration).toBe(1)
    expect(metadataOf(opened).completedDisplaySequence).toBe(metadataOf(opened).receivedSequence)
  })
})

test("module-scoped noVNC captures Display from the exact same-origin module without global UI", async () => {
  const page = new FakePage()
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    expect(page.globalUiDefined).toBe(false)
    expect(page.displayImportRequested).toBe(true)
    expect(page.displayInstanceGeneration).toBe(page.pageGeneration)
    expect(metadataOf(opened).completedDisplaySequence).toBe(metadataOf(opened).receivedSequence)
  })
})

test("the exact core/display.js prototype captures the invoking Display instance", async () => {
  const page = new FakePage()
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    expect(page.displayImportedPath).toBe("/core/display.js")
    expect(page.displayInstanceGeneration).toBe(page.pageGeneration)
    expect(page.displayFlushes).toBeGreaterThan(0)
  })
})

test("pinned Display module import failure is a canvas-stage failure", async () => {
  const page = new FakePage()
  page.displayImportFails = true
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const error = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never).catch((failure) => failure)
    expect(error).toMatchObject({ stage: "canvas" })
  })
})

test("a captured Display with the wrong target is a canvas-stage failure", async () => {
  const page = new FakePage()
  page.displayTargetMatches = false
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const error = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never).catch((failure) => failure)
    expect(error).toMatchObject({ stage: "canvas" })
  })
})

test("Display instances and completion watermarks are isolated by page generation", async () => {
  const first = new FakePage()
  const second = new FakePage()
  let launches = 0
  await withProductionBrowser(async () => {
    const page = launches++ === 0 ? first : second
    return new FakeBrowser(page) as unknown as Browser
  }, async (hooks) => {
    await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const firstFlushes = first.displayFlushes
    await hooks.tool!.polyscope_reset.execute({ target: "gate2" }, {} as never)
    expect(launches).toBe(2)
    expect(first.displayFlushes).toBe(firstFlushes)
    expect(second.displayFlushes).toBeGreaterThan(0)
    expect(first.displayInstanceGeneration).toBe(first.pageGeneration)
    expect(second.displayInstanceGeneration).toBe(second.pageGeneration)
    expect(second.pageGeneration).not.toBe(first.pageGeneration)
  })
})

test("real Chromium executes the production module-scoped Display tracker contract", async () => {
  const capturePage = new FakePage()
  await withProductionBrowser(async () => new FakeBrowser(capturePage) as unknown as Browser, async (hooks) => {
    await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
  })
  if (typeof capturePage.initScriptCallback !== "function" || typeof capturePage.displayCompletionCallback !== "function") {
    throw new Error("production page callbacks were not captured")
  }

  const initCallback = capturePage.initScriptCallback as (argument: Record<string, unknown>) => void
  const completionCallback = capturePage.displayCompletionCallback as (argument: Record<string, unknown>) => Promise<{ consumedFrames: number; renderGeneration: number }>
  const capturedInitArgument = capturePage.initScriptArgument as Record<string, unknown>
  const capturedCompletionArgument = capturePage.displayCompletionArgument as Record<string, unknown>
  let displayModuleRequests = 0
  let failDisplayRequests = false
  const displayModule = `
    globalThis.fixtureDisplayModuleURL = import.meta.url;
    globalThis.fixtureDisplayModuleLoads = (globalThis.fixtureDisplayModuleLoads || 0) + 1;
    export default class Display {
      constructor(target) {
        this._target = target;
        this.calls = [];
        this.pendingState = false;
        this.expectedError = new Error("fixture pending error");
        this.lastPromise = undefined;
      }
      pending(...args) {
        this.calls.push({ method: "pending", thisOK: this === globalThis.fixture?.instance, args });
        if (args[0] === "throw") throw this.expectedError;
        if (args[0] === "promise") {
          this.lastPromise = Promise.resolve("pending-promise:" + args[1]);
          return this.lastPromise;
        }
        if (args.length === 0) return this.pendingState;
        return "pending:" + args.join(":");
      }
      flush(...args) {
        this.calls.push({ method: "flush", thisOK: this === globalThis.fixture?.instance, args });
        if (args[0] === "throw") throw this.expectedError;
        if (args[0] === "promise") {
          this.lastPromise = Promise.resolve("flush-promise:" + args[1]);
          return this.lastPromise;
        }
        if (args.length === 0) this.pendingState = false;
        return "flush:" + args.join(":");
      }
    }
  `
  const appModule = `
    import Display from "/core/display.js";
    const params = new URLSearchParams(location.search);
    const visible = document.querySelector("canvas");
    const target = params.has("wrong") ? document.createElement("canvas") : visible;
    const instance = new Display(target);
    globalThis.fixture = { Display, instance, target, visible, generation: params.get("generation") || "initial" };
    const socket = new WebSocket("ws://" + location.host + "/websockify");
    socket.addEventListener("message", () => { globalThis.fixture.messageReceived = true; });
  `
  const html = `<!doctype html><canvas width="100" height="80"></canvas><script type="module" src="/app.js"></script>`
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request, bunServer) {
      const url = new URL(request.url)
      if (url.pathname === "/websockify") {
        if (bunServer.upgrade(request)) return
        return new Response("upgrade failed", { status: 400 })
      }
      const headers = { "cache-control": "no-store" }
      if (url.pathname === "/core/display.js") {
        displayModuleRequests++
        if (failDisplayRequests) return new Response("import failed", { status: 500, headers })
        return new Response(displayModule, { headers: { ...headers, "content-type": "text/javascript" } })
      }
      if (url.pathname === "/app.js") return new Response(appModule, { headers: { ...headers, "content-type": "text/javascript" } })
      return new Response(html, { headers: { ...headers, "content-type": "text/html" } })
    },
    websocket: {
      open(socket) { socket.send(new Uint8Array([1])) },
      message() {},
    },
  })
  const origin = `http://127.0.0.1:${server.port}`
  let browser: Browser | undefined
  let context: BrowserContext | undefined
  try {
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext()
    const install = async (page: Page, repeated = false) => {
      const argument = { ...capturedInitArgument, expectedHost: new URL(origin).host }
      await page.addInitScript(initCallback, argument)
      if (repeated) await page.addInitScript(initCallback, argument)
    }
    const waitReady = async (page: Page) => {
      await page.waitForFunction((key) => {
        const tracker = (globalThis as unknown as Record<string, unknown>)[key] as { displayStatus?: string; consumedFrames?: number } | undefined
        return tracker?.displayStatus === "ready" && Number(tracker.consumedFrames) >= 1 && Boolean((globalThis as unknown as { fixture?: unknown }).fixture)
      }, String(capturedInitArgument.key), { timeout: 5_000 })
    }
    const trackerState = (page: Page) => page.evaluate((key) => {
      const tracker = (globalThis as unknown as Record<string, unknown>)[key] as {
        displayStatus?: string
        displayError?: string
        displayInstance?: unknown
        displayPending?: unknown
        displayFlush?: unknown
      } | undefined
      const fixture = (globalThis as unknown as { fixture?: { Display: { prototype: Record<PropertyKey, unknown> }; instance: unknown; generation: string } }).fixture
      return {
        status: tracker?.displayStatus,
        error: tracker?.displayError,
        captured: Boolean(tracker?.displayInstance),
        methodsExact: Boolean(fixture && fixture.Display.prototype.pending === tracker?.displayPending && fixture.Display.prototype.flush === tracker?.displayFlush),
        generation: fixture?.generation,
      }
    }, String(capturedInitArgument.key))
    const complete = (page: Page) => page.evaluate(completionCallback, {
      ...capturedCompletionArgument,
      key: capturedInitArgument.key,
      watermark: 1,
      kind: "displayFlush",
    })

    const page = await context.newPage()
    const moduleRequestsBefore = displayModuleRequests
    await install(page, true)
    await page.goto(`${origin}/?generation=first`)
    await waitReady(page)
    const beforeInvocation = await trackerState(page)
    expect(beforeInvocation).toMatchObject({ status: "ready", captured: false, methodsExact: true, generation: "first" })
    expect(displayModuleRequests - moduleRequestsBefore).toBe(1)
    expect(await page.evaluate(() => (globalThis as unknown as { UI?: unknown }).UI)).toBeUndefined()
    expect(await page.evaluate(() => (globalThis as unknown as { fixtureDisplayModuleURL?: string }).fixtureDisplayModuleURL)).toBe(`${origin}/core/display.js`)
    expect(await page.evaluate(() => (globalThis as unknown as { fixtureDisplayModuleLoads?: number }).fixtureDisplayModuleLoads)).toBe(1)

    const behavior = await page.evaluate(async () => {
      const fixture = (globalThis as unknown as {
        fixture: {
          instance: {
            calls: Array<{ method: string; thisOK: boolean; args: unknown[] }>
            expectedError: Error
            lastPromise?: Promise<string>
            pending(...args: unknown[]): unknown
            flush(...args: unknown[]): unknown
          }
        }
      }).fixture
      const pendingReturn = fixture.instance.pending("alpha", 7)
      const promise = fixture.instance.flush("promise", 9) as Promise<string>
      const samePromise = promise === fixture.instance.lastPromise
      const promiseValue = await promise
      let sameError = false
      try { fixture.instance.pending("throw") } catch (error) { sameError = error === fixture.instance.expectedError }
      return { pendingReturn, samePromise, promiseValue, sameError, calls: fixture.instance.calls }
    })
    expect(behavior.pendingReturn).toBe("pending:alpha:7")
    expect(behavior.samePromise).toBe(true)
    expect(behavior.promiseValue).toBe("flush-promise:9")
    expect(behavior.sameError).toBe(true)
    expect(behavior.calls.filter((call) => call.method === "pending" && call.args[0] === "alpha")).toHaveLength(1)
    expect(behavior.calls.every((call) => call.thisOK)).toBe(true)
    expect((await trackerState(page)).captured).toBe(true)
    await expect(complete(page)).resolves.toMatchObject({ consumedFrames: 1 })

    await page.goto(`${origin}/?generation=navigation`)
    await waitReady(page)
    expect(await trackerState(page)).toMatchObject({ captured: false, generation: "navigation", methodsExact: true })
    await page.evaluate(() => (globalThis as unknown as { fixture: { instance: { pending(): unknown } } }).fixture.instance.pending())
    await expect(complete(page)).resolves.toMatchObject({ consumedFrames: 1 })

    const separatePage = await context.newPage()
    await install(separatePage)
    await separatePage.goto(`${origin}/?generation=separate`)
    await waitReady(separatePage)
    expect(await trackerState(separatePage)).toMatchObject({ captured: false, generation: "separate", methodsExact: true })
    await separatePage.evaluate(() => (globalThis as unknown as { fixture: { instance: { pending(): unknown } } }).fixture.instance.pending())
    await expect(complete(separatePage)).resolves.toMatchObject({ consumedFrames: 1 })

    const wrongTargetPage = await context.newPage()
    await install(wrongTargetPage)
    await wrongTargetPage.goto(`${origin}/?wrong=1`)
    await waitReady(wrongTargetPage)
    await wrongTargetPage.evaluate(() => (globalThis as unknown as { fixture: { instance: { pending(): unknown } } }).fixture.instance.pending())
    await expect(complete(wrongTargetPage)).rejects.toThrow("Display module instance pending()/flush() contract is unavailable")

    const replacedMethodPage = await context.newPage()
    await install(replacedMethodPage)
    await replacedMethodPage.goto(`${origin}/?generation=replaced`)
    await waitReady(replacedMethodPage)
    await replacedMethodPage.evaluate(() => {
      const fixture = (globalThis as unknown as { fixture: { Display: { prototype: { pending: (...args: unknown[]) => unknown } }; instance: { pending(): unknown } } }).fixture
      fixture.instance.pending()
      fixture.Display.prototype.pending = () => false
    })
    await expect(complete(replacedMethodPage)).rejects.toThrow("Display module instance pending()/flush() contract is unavailable")

    const importFailurePage = await context.newPage()
    await install(importFailurePage)
    failDisplayRequests = true
    await importFailurePage.goto(`${origin}/?importfail=1`)
    await importFailurePage.waitForFunction((key) => {
      const tracker = (globalThis as unknown as Record<string, unknown>)[key] as { displayStatus?: string } | undefined
      return tracker?.displayStatus === "error"
    }, String(capturedInitArgument.key), { timeout: 5_000 })
    const importFailure = await trackerState(importFailurePage)
    expect(importFailure.status).toBe("error")
    expect(importFailure.error).toContain("Failed to fetch dynamically imported module")
  } finally {
    await context?.close().catch(() => {})
    await browser?.close().catch(() => {})
    server.stop(true)
  }
}, 20_000)

test("an incompatible pinned noVNC display API fails with the canvas stage", async () => {
  const page = new FakePage()
  page.displayCompatible = false
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const error = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never).catch((failure) => failure)
    expect(error).toMatchObject({ stage: "canvas" })
  })
})

test("a delayed canvas paint before click invalidates authorization without dispatch", async () => {
  const page = new FakePage()
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    page.displayFlushDelay = 25
    let painted = false
    page.onDisplayFlush = () => {
      if (painted) return
      painted = true
      page.paint()
    }
    await expect(hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)).rejects.toThrow("render")
    expect(page.clickCalls).toBe(0)
  })
})

test("a canvas paint racing dispatch is indeterminate and never replayed", async () => {
  const page = new FakePage()
  page.onClick = (options) => {
    page.sendPointerSequence(options)
    page.paint()
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    await expect(hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)).rejects.toThrow("[indeterminate-click]")
    expect(page.clickCalls).toBe(1)
  })
})

test("active cancellation after committed pointer dispatch is indeterminate", async () => {
  const page = new FakePage()
  const dispatched = deferred<void>()
  const releaseClick = deferred<void>()
  page.onClick = async (options) => {
    page.sendPointerSequence(options)
    dispatched.resolve()
    await releaseClick.promise
  }
  try {
    await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
      const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
      const screenshotID = metadataOf(opened).id as string
      const abort = new AbortController()
      const result = hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, { abort: abort.signal } as never)
      await dispatched.promise
      abort.abort()
      await expect(result).rejects.toThrow("[indeterminate-click]")
      expect(page.clickCalls).toBe(1)
    })
  } finally {
    releaseClick.resolve()
  }
})

test("pre-dispatch cancellation remains ordinary and never clicks", async () => {
  const page = new FakePage()
  const flushStarted = deferred<void>()
  const releaseFlush = deferred<void>()
  try {
    await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
      const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
      const screenshotID = metadataOf(opened).id as string
      page.onDisplayFlush = async () => {
        flushStarted.resolve()
        await releaseFlush.promise
      }
      const abort = new AbortController()
      const result = hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, { abort: abort.signal } as never)
      await flushStarted.promise
      abort.abort()
      const error = await result.catch((failure) => failure)
      expect(error).toMatchObject({ stage: "cancelled" })
      expect(page.clickCalls).toBe(0)
    })
  } finally {
    releaseFlush.resolve()
  }
})

test("a permanently partial trailing pointer waits for the real deadline and is indeterminate", async () => {
  const page = new FakePage()
  const dispatched = deferred<void>()
  page.onClick = (options) => {
    page.sendPointerSequence(options)
    page.socket.send(pointerEvent(1, 20, 20).subarray(0, 3))
    dispatched.resolve()
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    const started = performance.now()
    const result = hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)
    await dispatched.promise
    const error = await result.catch((failure) => failure)
    expect(error).toMatchObject({ stage: "indeterminate-click" })
    expect(performance.now() - started).toBeGreaterThan(29_000)
    expect(page.clickCalls).toBe(1)
  })
}, 35_000)

test("an inbound frame racing dispatch is indeterminate and is never replayed", async () => {
  const page = new FakePage()
  page.onClick = (options) => {
    page.sendPointerSequence(options)
    page.socket.receive()
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    await expect(hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)).rejects.toThrow("[indeterminate-click]")
    expect(page.clickCalls).toBe(1)
  })
})

test("click cannot report success without an outbound RFB pointer sequence", async () => {
  const page = new FakePage()
  const originalNow = Date.now
  page.onClick = () => { Date.now = () => originalNow() + 31_000 }
  try {
    await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
      const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
      const screenshotID = metadataOf(opened).id as string
      await expect(hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)).rejects.toThrow("outbound RFB pointer")
      expect(page.clickCalls).toBe(1)
    })
  } finally {
    Date.now = originalNow
  }
})

test("malformed pointer coordinates cannot confirm click dispatch", async () => {
  const page = new FakePage()
  page.onClick = () => {
    page.socket.send(Buffer.concat([pointerEvent(1, 99, 79), pointerEvent(0, 99, 79)]))
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    await expect(hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)).rejects.toThrow("[indeterminate-click]")
    expect(page.clickCalls).toBe(1)
  })
})

test("an expected pointer prefix followed by an extra press is indeterminate", async () => {
  const page = new FakePage()
  page.onClick = () => {
    page.socket.send(Buffer.concat([
      pointerEvent(1, 20, 20),
      pointerEvent(0, 20, 20),
      pointerEvent(1, 20, 20),
    ]))
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    await expect(hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)).rejects.toThrow("[indeterminate-click]")
    expect(page.clickCalls).toBe(1)
  })
})

test("a delayed fragmented extra pointer must complete before exact history can reject it", async () => {
  const page = new FakePage()
  page.onClick = (options) => {
    page.sendPointerSequence(options)
    const extraPress = pointerEvent(1, 20, 20)
    setTimeout(() => page.socket.send(extraPress.subarray(0, 2)), 5)
    setTimeout(() => page.socket.send(extraPress.subarray(2)), 50)
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    await expect(hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)).rejects.toThrow("[indeterminate-click]")
    expect(page.clickCalls).toBe(1)
  })
})

test("chunked scaled pointer events confirm a single click while unrelated RFB messages are ignored", async () => {
  const page = new FakePage()
  page.canvasWidth = 200
  page.canvasHeight = 160
  page.onClick = () => {
    const press = pointerEvent(1, 50, 60)
    const release = pointerEvent(0, 50, 60)
    page.socket.send(Buffer.concat([framebufferRequest, keyEvent, pointerEvent(0, 7, 9)]))
    page.socket.send(press.subarray(0, 2))
    page.socket.send(Buffer.concat([press.subarray(2), framebufferRequest, release]))
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    const result = await hooks.tool!.polyscope_click.execute({ screenshotID, x: 25, y: 30, clicks: 1 }, {} as never)
    expect(page.clickCalls).toBe(1)
    expect(metadataOf(result).id).not.toBe(screenshotID)
  })
})

test("a coalesced scaled press/release pair for each click confirms a double click", async () => {
  const page = new FakePage()
  page.canvasWidth = 300
  page.canvasHeight = 240
  page.onClick = () => {
    page.socket.send(Buffer.concat([
      pointerEvent(1, 30, 60),
      pointerEvent(0, 30, 60),
      keyEvent,
      pointerEvent(1, 30, 60),
      pointerEvent(0, 30, 60),
    ]))
  }
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    const result = await hooks.tool!.polyscope_click.execute({ screenshotID, x: 10, y: 20, clicks: 2 }, {} as never)
    expect(page.clickCalls).toBe(1)
    expect(metadataOf(result).id).not.toBe(screenshotID)
  })
})

test("a confirmed outbound RFB pointer sequence permits one click and a fresh screenshot", async () => {
  const page = new FakePage()
  await withProductionBrowser(async () => new FakeBrowser(page) as unknown as Browser, async (hooks) => {
    const opened = await hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)
    const screenshotID = metadataOf(opened).id as string
    const result = await hooks.tool!.polyscope_click.execute({ screenshotID, x: 20, y: 20, clicks: 1 }, {} as never)
    expect(page.clickCalls).toBe(1)
    expect(metadataOf(result).id).not.toBe(screenshotID)
  })
})

test("browser recovery is centrally bounded to two attempts under one operation", async () => {
  let launches = 0
  await withProductionBrowser(async () => {
    launches++
    const page = new FakePage()
    page.failCanvas = true
    return new FakeBrowser(page) as unknown as Browser
  }, async (hooks) => {
    await expect(hooks.tool!.polyscope_open.execute({ target: "gate2" }, {} as never)).rejects.toThrow("browser attempt 2")
    expect(launches).toBe(2)
  })
})

describe("production operation controller", () => {
  test("RFB preflight rejects unsupported versions and accepts only 003.008 after socket close", async () => {
    let greeting = "RFB 003.007\n"
    const server = createServer((socket) => socket.end(greeting))
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const port = (server.address() as { port: number }).port
    await expect(rfbPreflight(port, Date.now() + 100)).rejects.toThrow("malformed")
    greeting = "RFB 003.008\n"
    await expect(rfbPreflight(port, Date.now() + 100)).resolves.toBeUndefined()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test("RFB preflight rejects bytes trailing the exact greeting", async () => {
    const server = createServer((socket) => socket.end("RFB 003.008\ntrailing"))
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const port = (server.address() as { port: number }).port
    await expect(rfbPreflight(port, Date.now() + 100)).rejects.toThrow("trailing")
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test("RFB preflight enforces a real silence deadline", async () => {
    const sockets = new Set<import("node:net").Socket>()
    const server = createServer((socket) => {
      sockets.add(socket)
      socket.once("close", () => sockets.delete(socket))
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const port = (server.address() as { port: number }).port
    await expect(rfbPreflight(port, Date.now() + 30)).rejects.toThrow("timed out")
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test("RFB preflight rejects malformed greetings", async () => {
    const server = createServer((socket) => socket.end("not-an-rfb!!"))
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const port = (server.address() as { port: number }).port
    await expect(rfbPreflight(port, Date.now() + 100)).rejects.toThrow("malformed")
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  test("derives only one numeric loopback VNC binding", () => {
    expect(deriveLoopbackVncPort({ "5900/tcp": [{ HostIp: "127.0.0.1", HostPort: "5902" }] })).toBe(5902)
    expect(() => deriveLoopbackVncPort({ "5900/tcp": [{ HostIp: "0.0.0.0", HostPort: "5902" }] })).toThrow("simulator")
  })

  test("completed operations cannot later abort or quarantine subsequent work", async () => {
    let cleanups = 0
    let release!: () => void
    const controller = createController({ timeoutMs: 100, onActiveAbort: async () => { cleanups++ } })
    await controller.enqueue(undefined, async () => "first")
    await new Promise((resolve) => setTimeout(resolve, 50))
    const second = controller.enqueue(undefined, async () => {
      await new Promise<void>((resolve) => { release = resolve })
      return "second"
    })
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(cleanups).toBe(0)
    release()
    await expect(second).resolves.toBe("second")
  })

  test("does not overtake a hung active operation after the queued caller times out", async () => {
    let release!: () => void
    const events: string[] = []
    const controller = createController({ timeoutMs: 20 })
    const first = controller.enqueue(undefined, async () => { events.push("first"); await new Promise<void>((resolve) => { release = resolve }); events.push("first-end") })
    const firstResult = first.catch((error) => error)
    const second = controller.enqueue(undefined, async () => { events.push("second") })
    await expect(second).rejects.toThrow("deadline")
    expect(events).toEqual(["first"])
    release()
    expect(await firstResult).toBeInstanceOf(Error)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(events).toEqual(["first", "first-end"])
  })

  test("removes a cancelled queued operation before it runs", async () => {
    let release!: () => void
    let ran = false
    const controller = createController()
    const first = controller.enqueue(undefined, async () => { await new Promise<void>((resolve) => { release = resolve }) })
    const abort = new AbortController()
    const queued = controller.enqueue(abort.signal, async () => { ran = true })
    abort.abort()
    await expect(queued).rejects.toThrow("cancelled")
    release(); await first
    expect(ran).toBe(false)
  })

  test("an actively cancelled operation retains the queue until its latent work quiesces", async () => {
    let release!: () => void
    const events: string[] = []
    const controller = createController({ timeoutMs: 500 })
    const abort = new AbortController()
    const first = controller.enqueue(abort.signal, async () => {
      events.push("first")
      await new Promise<void>((resolve) => { release = resolve })
      events.push("first-end")
    })
    const firstResult = first.catch((error) => error)
    const second = controller.enqueue(undefined, async () => { events.push("second") })
    abort.abort()
    expect(await firstResult).toBeInstanceOf(Error)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(events).toEqual(["first"])
    release()
    await second
    expect(events).toEqual(["first", "first-end", "second"])
  })

  test("disposal cancels an active hang and rejects pending work", async () => {
    let release!: () => void
    const controller = createController({ disposeGraceMs: 20 })
    const active = controller.enqueue(undefined, async () => { await new Promise<void>((resolve) => { release = resolve }) })
    const activeResult = active.catch((error) => error)
    const pending = controller.enqueue(undefined, async () => "never")
    const pendingResult = pending.catch((error) => error)
    const started = performance.now()
    const disposal = controller.dispose()
    expect(controller.disposed).toBe(true)
    await disposal
    expect(performance.now() - started).toBeLessThan(200)
    expect(await activeResult).toBeInstanceOf(Error)
    expect(await pendingResult).toBeInstanceOf(Error)
    release()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  test("failed active cleanup poisons the controller instead of overtaking", async () => {
    let release!: () => void
    let queuedRan = false
    const abort = new AbortController()
    const controller = createController({
      timeoutMs: 500,
      onActiveAbort: async () => { throw new Error("cleanup failed") },
    })
    const active = controller.enqueue(abort.signal, async () => {
      await new Promise<void>((resolve) => { release = resolve })
    })
    const activeResult = active.catch((error) => error)
    const queued = controller.enqueue(undefined, async () => { queuedRan = true })
    const queuedResult = queued.catch((error) => error)
    abort.abort()
    expect(await activeResult).toBeInstanceOf(Error)
    expect(await queuedResult).toBeInstanceOf(Error)
    expect(controller.disposed).toBe(true)
    expect(queuedRan).toBe(false)
    release()
  })
})
