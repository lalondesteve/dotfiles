import { Model, Provider } from '@opencode/plugin'

export const BASE_URL = 'http://cliproxy.netbird.cloud:8317/v1'
const MAX_BYTES = 2 * 1024 * 1024
const levels = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
const overrides = {
  'local-model': ['local-model', ['none']],
  'gpt-6-luna': ['GPT-6 Luna', ['low', 'medium']],
  'gpt-6.1-terra': ['GPT-6.1 Terra', ['low', 'medium', 'high']],
  'gpt-6.1-sol': ['GPT-6.1 Sol', ['medium', 'high', 'xhigh', 'max']],
}
const obj = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {}
const text = x => typeof x === 'string' && x.length <= 200 && x.trim() === x && x.length > 0 && !/[\x00-\x1f\x7f]/.test(x) ? x : undefined
const id = x => typeof x === 'string' && x.length <= 256 && x.length > 0 && !/[\s\x00-\x1f\x7f]/.test(x) ? x : undefined
const number = x => Number.isSafeInteger(x) && x > 0 && x <= 100000000 ? x : undefined

export function parseCatalog(value) {
  const root = obj(value)
  const lists = Array.isArray(value) ? [value] : [root.data, root.models].filter(item => item !== undefined)
  if (!lists.length || lists.some(list => !Array.isArray(list)) || root.object === 'error') throw Error('Invalid catalog')
  const merged = new Map()
  for (const list of lists) {
    if (list.length > 10000) throw Error('Catalog has too many models')
    for (const entry of list) {
      const e = obj(entry), modelId = id(e.id) ?? id(e.slug)
      if (!modelId) throw Error('Invalid model ID')
      const limit = obj(e.limit), modalities = obj(e.modalities)
      const input = e.input_modalities ?? modalities.input
      const rawLevels = e.supported_reasoning_levels
      const reasoning = Array.isArray(rawLevels) ? rawLevels.map(level => typeof level === 'string' ? level : obj(level).effort).filter(level => levels.has(level)) : []
      const clean = { id: modelId }
      const name = text(e.display_name) ?? text(e.name)
      const type = ['chat', 'image', 'decision'].includes(e.type) ? e.type : ['chat', 'image', 'decision'].includes(e.model_type) ? e.model_type : undefined
      const context = number(e.context_window) ?? number(e.max_context_window) ?? number(e.context_length) ?? number(e.max_context_tokens) ?? number(limit.context)
      const output = number(e.max_output_tokens) ?? number(e.max_completion_tokens) ?? number(e.max_tokens) ?? number(e.output_token_limit) ?? number(limit.output)
      if (name) clean.name = name
      if (type) clean.type = type
      else if (/^gpt-image(?:-|$)/i.test(modelId)) clean.type = 'image'
      if (context) clean.context = context
      if (output) clean.output = output
      if (Array.isArray(input)) {
        const supported = [...new Set(input.filter(item => ['text', 'image'].includes(item)))]
        if (supported.length) clean.input = supported
      }
      if (reasoning.length) clean.reasoning = [...new Set(reasoning)]
      merged.set(modelId, { ...merged.get(modelId), ...clean })
    }
  }
  return [...merged.values()]
}

export function mapModels(catalog) {
  const provider = Provider.ID.make('cliproxy')
  return catalog.map(entry => {
    const model = Model.Info.default(provider, Model.ID.make(entry.id))
    const override = Object.hasOwn(overrides, entry.id) ? overrides[entry.id] : undefined
    const reasoning = override?.[1] ?? entry.reasoning
    return { ...model, ...(entry.type ? { type: entry.type } : {}), name: override?.[0] ?? entry.name ?? model.name,
      limit: {
        ...model.limit,
        ...(entry.context ? { context: entry.context } : {}),
        output: Math.min(entry.output ?? model.limit.output, entry.context ?? model.limit.context),
      },
      capabilities: { ...model.capabilities, ...(entry.input ? { input: entry.input } : {}) },
      variants: reasoning ? reasoning.map(level => ({ id: Model.VariantID.make(level), settings: { reasoningEffort: entry.id === 'local-model' && level === 'none' ? 'low' : level } })) : model.variants,
    }
  })
}

export function modelsURL(base) {
  const url = new URL(base)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !/^\/v1\/*$/.test(url.pathname)) throw Error('Invalid endpoint')
  url.pathname = '/v1/models'
  return url
}

export async function fetchCatalog(base, key, fetcher = fetch) {
  const url = modelsURL(base)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetcher(url, { headers: { Authorization: `Bearer ${key}` }, redirect: 'error', signal: controller.signal })
    if (!response.ok || response.redirected || (response.url && response.url !== url.href)) throw Error('Discovery failed')
    const length = response.headers.get('content-length')
    if (length && Number(length) > MAX_BYTES) throw Error('Catalog too large')
    if (!response.body) throw Error('Missing catalog')
    const reader = response.body.getReader(), chunks = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_BYTES) { await reader.cancel(); throw Error('Catalog too large') }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    return parseCatalog(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  } finally { clearTimeout(timer) }
}
