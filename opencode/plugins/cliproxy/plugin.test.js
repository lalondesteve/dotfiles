import { test } from 'node:test'
import assert from 'node:assert/strict'
import plugin from './index.js'

test('failed credential lookup preserves cached inventory and associates integration', async () => {
  let transform, reloads = 0
  const ctx = {
    storage: { get: async () => ({ object: 'list', data: [{ id: 'gpt-6-luna' }] }) },
    integration: {
      transform: async () => {},
      connection: { active: async () => { throw Error('unavailable') } },
    },
    provider: { transform: async cb => { transform = cb }, reload: async () => { reloads++ } },
    event: { subscribe: async function* () {} },
  }
  const cleanup = await plugin.setup(ctx)
  let info, models
  transform({ add: ({ info: value, models: items }) => { info = value; models = items } })
  assert.equal(info.integrationID, 'cliproxy')
  assert.deepEqual(models.map(m => m.id), ['gpt-6-luna'])
  assert.equal(reloads, 0)
  cleanup()
})
