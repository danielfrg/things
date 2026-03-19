# Things CLI

## Setup

Set your API key and base URL as environment variables:

```bash
export THINGS_BASE_URL="http://localhost:3000"
export THINGS_API_KEY="your_api_key_here"
```

## Usage

```
vp run --filter @danielfrg/things-cli start --help
```

Build standalone executable:

```bash
vp run --filter @danielfrg/things-cli build
```

Note: executable packaging via `vp pack` requires Node.js 25.7+.
