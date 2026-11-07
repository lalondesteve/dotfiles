import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCatalog, mapModels, modelsURL, fetchCatalog } from './core.js'

test('standard, rich and duplicate catalog metadata', () => {
  const catalog = parseCatalog({ object: 'list', data: [{ id: 'example' }, { id: 'example', display_name: 'Example', context_window: 100000, max_output_tokens: 4096, input_modalities: ['text', 'image'], supported_reasoning_levels: ['low', { effort: 'high' }] }, { slug: 'other', name: 'Other' }] })
  assert.equal(catalog.length, 2)
  const model = mapModels(catalog)[0]
  assert.equal(model.name, 'Example')
  assert.deepEqual(model.limit, { context: 100000, output: 4096 })
  assert.deepEqual(model.capabilities.input, ['text', 'image'])
  assert.deepEqual(model.variants.map(v => v.id), ['low', 'high'])
  assert.equal(parseCatalog({ models: [{ slug: 'rich', display_name: 'Rich catalog' }] })[0].id, 'rich')
  assert.deepEqual(parseCatalog([{ id: 'array-model' }]).map(item => item.id), ['array-model'])
})

test('overrides preserve names and variants without inventing IDs', () => {
  const models = mapModels(parseCatalog({ data: ['local-model', 'gpt-6-luna', 'gpt-6.1-terra', 'gpt-6.1-sol'].map(id => ({ id, name: 'ignored', supported_reasoning_levels: ['max'] })) }))
  assert.deepEqual(models.map(m => m.name), ['local-model', 'GPT-6 Luna', 'GPT-6.1 Terra', 'GPT-6.1 Sol'])
  assert.deepEqual(models.map(m => m.variants.map(v => v.id)), [['none'], ['low', 'medium'], ['low', 'medium', 'high'], ['medium', 'high', 'xhigh', 'max']])
  assert.equal(models[0].variants[0].settings.reasoningEffort, 'low')
  assert.equal(mapModels(parseCatalog({ data: [] })).length, 0)
  assert.equal(mapModels(parseCatalog({ data: [{ id: 'gpt-image-2.6' }] }))[0].type, 'image')
  assert.equal(mapModels(parseCatalog({ data: [{ id: 'other-image', type: 'image' }] }))[0].type, 'image')
})

test('reject invalid shapes and IDs and discard unsupported metadata', () => {
  for (const data of [null, {}, { data: null }, { object: 'error', data: [] }, { data: [{}] }, { data: [{ id: 'bad id' }] }]) assert.throws(() => parseCatalog(data))
  const m = mapModels(parseCatalog({ data: [{ id: 'x', context_window: -1, input_modalities: ['text', 'evil'], supported_reasoning_levels: ['bad'] }] }))[0]
  assert.deepEqual(m.capabilities.input, ['text'])
  assert.deepEqual(m.variants, [])
  assert.equal(m.limit.context, 200000)
  const capped = mapModels([{ id: 'capped', context: 1000, output: 2000 }])[0]
  assert.equal(capped.limit.output, 1000)
})

test('endpoint scoped and redirects refused', async () => {
  assert.equal(modelsURL('http://localhost:8317/v1/').href, 'http://localhost:8317/v1/models')
  for (const url of ['http://localhost/v2', 'http://u:p@localhost/v1', 'http://localhost/v1?x=1', 'http://localhost/v1/../other', 'file:///v1']) assert.throws(() => modelsURL(url))
  await assert.rejects(fetchCatalog('http://localhost/v1', 'test', async (_url, opts) => { assert.equal(opts.redirect, 'error'); return new Response('', { status: 302, headers: { location: 'http://evil/' } }) }))
  await assert.rejects(fetchCatalog('http://localhost/v1', 'test', async () => new Response('x'.repeat(2 * 1024 * 1024 + 1))))
  assert.deepEqual(await fetchCatalog('http://localhost/v1', 'test', async () => new Response('{"object":"list","data":[]}')), [])
})
