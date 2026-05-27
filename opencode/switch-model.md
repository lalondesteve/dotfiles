# Model Switcher System

A system for managing and switching between local LLM models with both CLI and HTTP API interfaces.

## Overview

This system provides two ways to switch between local LLM models:
1. **CLI Tool**: `switch-model` command for local use
2. **HTTP API**: REST API on port 8888 for remote switching from any device on the network

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CLI Client    │────▶│  Model Switcher  │────▶│  llama-cpp      │
│  switch-model   │     │  (Bash/Python)   │     │  (LLM Server)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   Systemd        │
                        │   Services       │
                        └──────────────────┘
```

## Components

### 1. CLI Tool: `switch-model`

**Location**: `~/.local/bin/switch-model`

**Language**: Bash

**Purpose**: Switch between models via command line

**Usage**:
```bash
switch-model              # Show available models
switch-model qwen         # Switch to Qwen3-14B
switch-model gemma        # Switch to Gemma 4 26B
switch-model devstral     # Switch to Devstral Small 2
```

**How it works**:
- Defines available models in associative arrays
- Checks if model file exists
- Updates systemd service file (`llama-cpp.service`) with new model path
- Reloads systemd and restarts the service
- Waits for service to be ready and confirms status

**Model Configurations**:
| Model | File | Context | Size |
|-------|------|---------|------|
| qwen | Qwen3-14B-Q4_K_M.gguf | 131072 (128K) | 8.4GB |
| gemma | gemma-4-26B-A4B-it-Q4_K_M.gguf | 131072 (128K) | 16GB |
| devstral | Devstral-Small-2-24B-Instruct-2512-Q4_K_M.gguf | 262144 (256K) | 14.3GB |

### 2. HTTP API Service

**Location**: `~/.llama/api/main.py`

**Language**: Python (FastAPI)

**Port**: 8888 (accessible from any device on local network)

**Virtual Environment**: `~/.llama/api/.venv` (managed with `uv`)

**Systemd Service**: `model-switcher-api.service`

#### API Endpoints

**GET /**
- Returns API information and available endpoints
- Example response:
```json
{
  "service": "LLM Model Switcher API",
  "version": "1.0.0",
  "endpoints": {
    "GET /model": "Get current active model",
    "GET /model-available": "Get list of available models",
    "POST /model": "Switch to a different model"
  }
}
```

**GET /model**
- Returns the currently active model
- Example response:
```json
{
  "name": "qwen",
  "file": "Qwen3-14B-Q4_K_M.gguf",
  "status": "running"
}
```

**GET /model-available**
- Returns list of all models with their availability status
- Example response:
```json
{
  "models": [
    {
      "name": "qwen",
      "size": "8.4G",
      "context": 131072,
      "description": "Qwen3 14B - General purpose model",
      "downloaded": true
    },
    {
      "name": "gemma",
      "size": "16G",
      "context": 131072,
      "description": "Gemma 4 26B MoE - Google's model",
      "downloaded": true
    },
    {
      "name": "devstral",
      "size": "14.3G",
      "context": 262144,
      "description": "Devstral Small 2 - Coding specialist",
      "downloaded": true
    }
  ]
}
```

**POST /model**
- Switches to a different model
- Request body: `{"model": "gemma"}`
- Example response:
```json
{
  "success": true,
  "message": "Successfully switched to gemma",
  "output": "..."
}
```

#### API Usage Examples

```bash
# Get API info
curl http://arch-t1:8888/

# Get current model
curl http://arch-t1:8888/model

# Get available models
curl http://arch-t1:8888/model-available

# Switch to gemma
curl -X POST http://arch-t1:8888/model \
  -H "Content-Type: application/json" \
  -d '{"model": "gemma"}'

# Switch back to qwen
curl -X POST http://arch-t1:8888/model \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen"}'

# Switch to devstral (coding specialist)
curl -X POST http://arch-t1:8888/model \
  -H "Content-Type: application/json" \
  -d '{"model": "devstral"}'
```

## Systemd Services

### llama-cpp.service
- **Purpose**: Runs the llama.cpp LLM server
- **Port**: 8080
- **Models Directory**: `~/.llama/models/`
- **Binary**: `~/.llama/llama.cpp/build/bin/llama-server`
- **Status**: GPU-enabled build with CUDA support

### model-switcher-api.service
- **Purpose**: Runs the FastAPI model switcher service
- **Port**: 8888
- **Python**: `~/.llama/api/.venv/bin/uvicorn`
- **API File**: `~/.llama/api/main.py`

## Models

### Qwen3-14B
- **Type**: Dense transformer (14B parameters)
- **Size**: 8.4GB (Q4_K_M quantization)
- **Context**: 128K tokens
- **Best For**: General purpose tasks, balanced performance
- **Status**: ✅ Downloaded and ready

### Gemma 4 26B
- **Type**: MoE (Mixture of Experts) - 26B total, 4B active
- **Size**: 16GB (Q4_K_M quantization)
- **Context**: 128K tokens
- **Best For**: Efficiency with large context
- **Status**: ✅ Downloaded and ready

### Devstral Small 2
- **Type**: Dense transformer (24B parameters)
- **Size**: 14.3GB (Q4_K_M quantization)
- **Context**: 256K tokens
- **Best For**: Coding and software engineering tasks
- **SWE-Bench**: 68% (excellent coding performance)
- **License**: Apache 2.0
- **Status**: ✅ Downloaded and ready

## File Locations

```
~/.local/bin/switch-model                    # CLI tool
~/.llama/api/main.py                         # FastAPI application
~/.llama/api/.venv/                          # Python virtual environment
~/.llama/models/                             # GGUF model files
~/.llama/llama.cpp/                          # llama.cpp source and build
~/.llama/llama.cpp/build/bin/llama-server    # LLM server binary
~/dotfiles/opencode/llama-cpp.service        # LLM server systemd service
~/dotfiles/opencode/model-switcher-api.service # API systemd service
~/dotfiles/opencode/opencode.json            # Opencode configuration
```

## Management Commands

### Check Services
```bash
systemctl --user status llama-cpp           # LLM server status
systemctl --user status model-switcher-api  # API status
```

### View Logs
```bash
journalctl --user -u llama-cpp -f           # LLM server logs
journalctl --user -u model-switcher-api -f  # API logs
```

### Restart Services
```bash
systemctl --user restart llama-cpp          # Restart LLM server
systemctl --user restart model-switcher-api # Restart API
```

### Switch Models (CLI)
```bash
switch-model qwen
switch-model gemma
switch-model devstral
```

### Switch Models (API)
```bash
curl -X POST http://arch-t1:8888/model \
  -H "Content-Type: application/json" \
  -d '{"model": "MODEL_NAME"}'
```

## Technical Notes

### CPU-Only Mode
The current llama.cpp build is CPU-only because the CUDA toolkit (`nvcc`) was not available on the system. To enable GPU acceleration:
1. Install CUDA toolkit
2. Rebuild llama.cpp with `-DLLAMA_CUDA=ON`
3. Add `-ngl 999` flag for GPU layer offloading

### Context Windows
- Models support large context windows (128K-256K)
- KV cache is pre-allocated based on context size
- CPU mode is slower than GPU but supports all model architectures

### Security
- API listens on `0.0.0.0:8888` (accessible from local network)
- No authentication currently implemented
- Consider adding API key auth if exposing to untrusted networks

## History

This system was built to:
1. Enable easy switching between different LLM models
2. Provide remote model switching capability via HTTP API
3. Support multiple model architectures (Qwen, Gemma, Devstral)
4. Manage large context windows (128K-256K tokens)
5. Integrate with systemd for service management

## Future Improvements

- [ ] Add GPU support by rebuilding llama.cpp with CUDA
- [ ] Add authentication to the API
- [ ] Add model loading progress endpoint
- [ ] Support concurrent model switching queue
- [ ] Add model performance metrics endpoint
