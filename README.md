# AI Search Companion (M0)

An MV3 Chrome extension that places a clearly labelled, third-party answer card above standard Google web results. M0 deliberately ships only a deterministic local **Demo** streaming provider: it has no API keys, OAuth, native companion, network inference, analytics, or hidden billing.

## Prerequisites

- Windows, Node.js 22+ (the workspace was verified with Node 26), and pnpm 10+
- Google Chrome for unpacked-extension testing

## Install and run

```powershell
pnpm install
pnpm dev
```

WXT writes a development extension to `apps/extension/.output/chrome-mv3-dev`. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select that folder. Search `https://www.google.com/search?q=weather` and click **Generate AI answer**. Use the toolbar popup to enable automatic generation explicitly.

## Verify and package

```powershell
pnpm typecheck
pnpm test
pnpm build
```

The production unpacked extension is written to `apps/extension/.output/chrome-mv3`.

## M0 behavior and boundaries

- Uses only `https://www.google.com/search*` and `storage` permissions.
- Reads Google’s `q` URL parameter; it never changes the URL or results.
- `-noai` as a standalone token (case-insensitive) removes the card and makes no request.
- Automatic generation is off by default. Navigation tears down the prior card and cancels its stream; a request identity guard prevents stale updates.
- The Shadow-DOM card is accessible, responsive, and adapts to the browser color scheme. It says `Demo` and `Third-party output by AI Search Companion` on every result.
- Provider events and extension messages have typed contracts; background-worker messages are schema-validated. Content scripts never receive keys or OAuth credentials (none exist in M0).

## Not implemented

Real OpenAI/Gemini/Anthropic BYOK providers, API-key storage, citations, native messaging, and Sign in with ChatGPT are intentionally deferred. In particular, M0 does not use cookies, private ChatGPT endpoints, OAuth shortcuts, or a remote relay. ChatGPT plan integration requires the later optional native companion and documented loopback OAuth flow.

## Project map

- `packages/core`: provider, stream-event, query, and message contracts
- `apps/extension`: WXT MV3 extension, demo provider, Google adapter, popup/options UI
- `reference/search-poc.png`: visual reference supplied with the project
