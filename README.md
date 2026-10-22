# Revora Frontend

Revora is a revenue-sharing platform on the [Stellar](https://stellar.org) network. Startups register
**RevenueShare offerings**, report revenue, and distribute payouts; investors discover offerings,
track their portfolio and review an on-chain ledger of distributions.

This repository is the web front end (React + Vite + TypeScript). It is a **demo UI**: all data is
sample data generated in the browser. Login and Signup can connect to Freighter to display
your Stellar address and network; no transactions are signed or submitted. Revora uses TESTNET.

**Live site:** https://revora-frontend-omega.vercel.app

## Contracts

Deployed on the Stellar **testnet** (no real funds):

| Contract | ID | Explorer |
| --- | --- | --- |
| Revora revenue-deposit | `CABIJLQV4TKBHMETNIISV4OT76EDR5WXCZVJJLXHA6AEIII2JVYAHP2I` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CABIJLQV4TKBHMETNIISV4OT76EDR5WXCZVJJLXHA6AEIII2JVYAHP2I) / [Stellar Lab](https://lab.stellar.org/r/testnet/contract/CABIJLQV4TKBHMETNIISV4OT76EDR5WXCZVJJLXHA6AEIII2JVYAHP2I) |

## Features

- Landing page with entry points to every area of the app
- Auth screens: sign in, sign up, forgot password, 2FA recovery and backup codes
- Startup: issuer dashboard, monthly revenue reporting, offering registration wizard with document uploader, governance proposal creation and vote receipt
- Investor: offering discovery with filters, portfolio summary (allocation, performance), virtualized ledger table, payout schedule (Gantt/timeline)
- Admin: alerts inbox, scheduled exports
- Design system: tokens, density modes, empty/error states, status timelines, notification bell, command palette, RTL and accessibility guidelines

## Quickstart

Requires Node.js 20+ (CI uses 22).

```bash
npm ci
npm run dev        # http://localhost:5173
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over `src/` |
| `npm test` | Vitest with coverage (`npm run test:watch` to watch) |

## Environment variables

None are required. The app runs entirely client-side with mock data.

## Routes

`/`, `/login`, `/signup`, `/forgot-password`, `/recover-2fa`, `/settings/2fa/backup-codes`,
`/startup/dashboard`, `/startup/report-revenue`, `/startup/offering-registration`,
`/startup/governance/proposals/create`, `/startup/governance/vote-receipt`,
`/investor/portal`, `/investor/portfolio`, `/investor/ledger`, `/investor/payouts`,
`/admin/alerts`, `/admin/scheduled-exports`. Unknown paths show a "Page not found" screen.

## Deploy

The site is a static SPA deployed on Vercel. `vercel.json` rewrites all paths to `index.html`.

```bash
npm i -g vercel
vercel --prod
```

Any static host works: build with `npm run build` and serve `dist/` with an SPA fallback.

## Documentation

Design and UX notes live in [`docs/`](docs/) (see `docs/uiux/` for per-component specs,
plus accessibility, RTL and responsive guidelines).

## CI

GitHub Actions (`.github/workflows/ci.yml`) installs dependencies and runs the production build
on every push and pull request to `master`.

## Known limitations

Some tests and type checks are not enforced in CI; `src/pages/AuditTrail.tsx` and
`src/pages/DistributionDashboard.tsx` have syntax errors and are not wired into any route.

## Stellar wallet connection

The Login and Signup wallet buttons open a controlled Freighter connection dialog. Install
[Freighter](https://www.freighter.app/), approve access, and select TESTNET in the extension.
The shared context refreshes the account and network every three seconds while connected.
Disconnect clears this app's connection state; extension permissions can be revoked in Freighter.
Cancelling or closing the dialog ignores pending results but cannot close the extension's prompt.
Wallet state is kept in memory and is not treated as an authenticated email session.

Run the SDK-mocked wallet and accessibility tests with:

```bash
npx vitest run src/components/WalletConnection src/pages/Login.test.tsx src/pages/Signup.test.tsx
```
