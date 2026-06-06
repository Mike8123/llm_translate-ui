# TranslateGemma UI

[![Build](https://img.shields.io/github/actions/workflow/status/realies/translategemma-ui/build.yml?style=flat-square&logo=github)](https://github.com/realies/translategemma-ui/actions)
[![Pulls](https://img.shields.io/docker/pulls/realies/translategemma-ui?style=flat-square&logo=docker)](https://hub.docker.com/r/realies/translategemma-ui)
[![Size](https://img.shields.io/docker/image-size/realies/translategemma-ui?style=flat-square&logo=docker)](https://hub.docker.com/r/realies/translategemma-ui)

Web interface for [TranslateGemma](https://blog.google/innovation-and-ai/technology/developers-tools/translategemma/), Google's open translation model.

![TranslateGemma UI](demo.gif)

## Features

- **55 languages** — searchable language selector with recent language pills
- **Auto-translate** — starts translating as you type, no button needed
- **Local inference** — no data leaves your machine, powered by [LM Studio](https://lmstudio.ai)
- **Remembers preferences** — last used language pair and recents restored on reload
- **Swap languages** — flip source and target with one click
- **Streaming translations** — see results appear in real-time as the model generates them
- **Rate limiting** — built-in per-IP rate limiter for API requests
- **Localized UI** — interface labels adapt to your browser's language
- **Light & dark mode** — follows your system preference
- **Multi-arch Docker** — native images for `linux/amd64` and `linux/arm64`

## Quick Start

```yaml
services:
  translategemma-ui:
    image: realies/translategemma-ui
    container_name: translategemma-ui
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      - LM_STUDIO_URL=http://host.docker.internal:1234
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Access the UI at `http://localhost:3000`

## Requirements

[LM Studio](https://lmstudio.ai) with a TranslateGemma model loaded and the local server running.

1. Download LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Search for and download `google/translategemma-27b-it` (or another compatible translation model)
3. Load the model in LM Studio
4. Open **Server Settings** and start the local server (default port `1234`)
5. Set `LM_STUDIO_URL` to your LM Studio address if not on localhost

## Configuration

| Variable        | Default                              | Description                                          |
| --------------- | ------------------------------------ | ---------------------------------------------------- |
| `LM_STUDIO_URL` | `http://localhost:1234`              | LM Studio OpenAI-compatible API endpoint             |
| `DEFAULT_MODEL` | `google/translategemma-27b-it`       | Model name (must match a loaded model in LM Studio)  |
| `PORT`          | `3000`                               | Server port                                          |
| `HOST`          | `0.0.0.0`                            | Server host                                          |

## Supported Languages

Arabic, Bengali, Bulgarian, Catalan, Chinese (Simplified/Traditional), Croatian, Czech, Danish, Dutch, English, Estonian, Filipino, Finnish, French (Canada/France), German, Greek, Gujarati, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Italian, Japanese, Kannada, Korean, Latvian, Lithuanian, Malayalam, Marathi, Norwegian, Persian, Polish, Portuguese (Brazil/Portugal), Punjabi, Romanian, Russian, Serbian, Slovak, Slovenian, Spanish (Mexico), Swahili, Swedish, Tamil, Telugu, Thai, Turkish, Ukrainian, Urdu, Vietnamese, Zulu

## Tech Stack

- [TanStack Start](https://tanstack.com/start) — React 19 full-stack framework
- [Tailwind CSS](https://tailwindcss.com) — styling
- [TypeScript](https://www.typescriptlang.org) — type safety
