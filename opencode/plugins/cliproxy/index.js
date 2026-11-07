import { Integration, Plugin, Provider } from '@opencode/plugin'
import { BASE_URL, fetchCatalog, mapModels, parseCatalog } from './core.js'

export default Plugin.define({
  id: 'cliproxy.discovery',
  async setup(ctx) {
    const options = ctx.options ?? {}
    const baseURL = typeof options.baseURL === 'string' ? options.baseURL : BASE_URL
    const refreshMinutes = Number.isSafeInteger(options.refreshMinutes) && options.refreshMinutes >= 1 && options.refreshMinutes <= 1440 ? options.refreshMinutes : 15
    let catalog
    let sourceConnection
    let activeRefresh
    const cacheKey = `catalog:${baseURL}`
    try {
      const cache = await ctx.storage.get(cacheKey)
      if (cache && typeof cache === 'object' && Array.isArray(cache.data)) catalog = parseCatalog(cache)
    } catch { /* Ignore an invalid or unavailable cache. */ }

    await ctx.integration.transform(editor => {
      editor.update('cliproxy', integration => { integration.name = 'CLIProxy' })
      editor.method.update({
        integrationID: 'cliproxy',
        method: { type: 'key', label: 'CLIProxy API key' },
      })
    })
    try { sourceConnection = await ctx.integration.connection.active('cliproxy') } catch { /* Refresh retries this lookup. */ }

    const refresh = async () => {
      if (activeRefresh) return activeRefresh
      activeRefresh = (async () => {
        try {
          const connection = await ctx.integration.connection.active('cliproxy')
          if (!connection) {
            console.warn('[cliproxy.discovery] no active CLIProxy credential; keeping cached models')
            return
          }
          const credential = await ctx.integration.connection.resolve(connection)
          if (credential?.type !== 'key' || !credential.key) {
            console.warn('[cliproxy.discovery] active CLIProxy credential is not an API key; keeping cached models')
            return
          }
          const next = await fetchCatalog(baseURL, credential.key)
          catalog = next
          sourceConnection = connection
          await ctx.provider.reload()
          try {
            await ctx.storage.set(cacheKey, {
              object: 'list',
              data: next.map(item => Object.fromEntries(Object.entries({
                id: item.id,
                name: item.name,
                context_window: item.context,
                max_output_tokens: item.output,
                input_modalities: item.input,
                supported_reasoning_levels: item.reasoning,
              }).filter(([, value]) => value !== undefined))),
              checkedAt: Date.now(),
            })
          } catch { /* Keep the refreshed catalog in memory if cache storage fails. */ }
        } catch {
          // Keep the last-known-good inventory and never log server bodies or credentials.
          console.warn('[cliproxy.discovery] catalog refresh failed; keeping cached models')
        }
      })().finally(() => { activeRefresh = undefined })
      return activeRefresh
    }

    await ctx.provider.transform(editor => {
      const id = Provider.ID.make('cliproxy')
      editor.add({
        info: {
          ...Provider.Info.empty(id),
          name: 'CLIProxy',
          activation: 'enabled',
          integrationID: Integration.ID.make('cliproxy'),
          package: '@opencode/ai/providers/openai-compatible',
          settings: { baseURL },
        },
        models: catalog ? mapModels(catalog) : [],
        ...(sourceConnection ? { sourceConnection } : {}),
      })
    })
    await refresh()
    const controller = new AbortController()
    void (async () => {
      try {
        for await (const _event of ctx.event.subscribe({ types: ['credential.updated', 'credential.switched'], signal: controller.signal })) {
          void refresh()
        }
      } catch { /* The periodic refresh remains available if the event stream ends. */ }
    })()
    const timer = setInterval(() => { void refresh() }, refreshMinutes * 60 * 1000)
    timer.unref?.()
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  },
})
