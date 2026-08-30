# Trobkit

JavaScript / TypeScript SDK for the **Trobium** blockchain HTTP API.

| | |
|---|---|
| Chain | Trobium |
| Package | `trobkit` |
| Ticker | **TROB** |
| Smallest unit | **TROBI** (`1 TROB = 1_000_000 TROBI`) |
| Super Representatives | **21** (configured on-chain) |
| Address prefix | `0x41` (Base58 addresses start with `T`) |

Trobkit is based on the TronWeb architecture and is protocol-compatible with Tron-like nodes, with Trobium branding, units, and error messages.

## Installation

```bash
npm install trobkit
```

or

```bash
yarn add trobkit
```

### Browser

```bash
cp node_modules/trobkit/dist/Trobkit.js ./js/trobkit.js
```

```html
<script src="./js/trobkit.js"></script>
```

## Creating an instance

```typescript
import { Trobkit, utils as TrobkitUtils, Trob, TransactionBuilder, Contract, Event, Plugin } from 'trobkit';

const trobkit = new Trobkit({
    fullHost: 'https://your-trobium-fullhost.example',
    privateKey: 'your private key',
});
```

You can also set `fullNode`, `solidityNode`, and `eventServer` separately:

```js
const trobkit = new Trobkit({
    fullNode: 'https://some-node.tld',
    solidityNode: 'https://some-other-node.tld',
    eventServer: 'https://some-event-server.tld',
    privateKey: 'your private key',
});
```

Legacy positional constructor is still supported:

```js
const trobkit = new Trobkit(fullNode, solidityNode, eventServer, privateKey);
```

## Units

```js
Trobkit.toTrobi(1);      // "1000000"
Trobkit.fromTrobi(1000000); // "1"
```

Native transfers use `sendTrob` / `transactionBuilder.sendTrob`. The instance API for balances and signing lives on `trobkit.trob`.

## Super Representatives

Trobium elects **21** Super Representatives. The SDK exposes `SUPER_REPRESENTATIVE_COUNT` for client use; witness lists are returned by the node (`listSuperRepresentatives`, etc.).

## Compatibility

- Node.js v14 and above
- Browsers with more than 0.25% market share
- Frontend frameworks such as Angular, React, and Vue
- Chrome extensions

Built outputs:

- ESM / CJS under `lib/`
- UMD browser bundle: `dist/Trobkit.js`
- Node bundle: `dist/Trobkit.node.js`

## Local testing

Point `fullHost` (or the test helper config) at your local Trobium node. By default the test suite expects a node on `http://127.0.0.1:9090`.

```bash
npm i
npm run build:all
npm run test
```

## FAQ

**Cannot destructure property `Transaction` of `globalThis.TrobkitProto` as it is undefined.**

Webpack may not load `.cjs` protocol files correctly. Add:

```js
{
  test: /\.cjs$/,
  type: 'javascript/auto'
}
```

## Licence

Trobkit is distributed under the MIT licence.

Copyright (c) 2023 TRON Foundation  
Copyright (c) 2026 Trobium / Trobkit
