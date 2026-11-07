# CLIProxy model discovery

This OpenCode V2 plugin reads the available model catalog from the configured
CLIProxy endpoint and registers the models under the `cliproxy` provider. It
keeps the OpenAI-compatible request route already used by OpenCode.

The plugin uses the existing `cliproxy` credential connection. It reads the key
only while making the catalog request and does not save it in the plugin cache.
The cache contains validated model metadata only. Discovery runs at startup,
every 15 minutes, and when OpenCode reports a credential change. A failed
refresh keeps the last successful catalog.

The current endpoint uses HTTP. The catalog request sends the same API key over
that connection that OpenCode already uses for inference. Use HTTPS if the
CLIProxy endpoint supports it.

The model names and reasoning variants for `local-model`, `gpt-6-luna`,
`gpt-6.1-terra`, and `gpt-6.1-sol` are preserved in `core.js`. New model IDs and
metadata come from CLIProxy. Image-generation IDs are marked as image models so
OpenCode does not offer them as chat models.

Run the focused tests from this directory:

```sh
node --test *.test.js
```
