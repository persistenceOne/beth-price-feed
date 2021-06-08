# bETH/USD JSON-RPC Price Feed

Repository contains implementation of bETH/USD JSON-RPC Price Feed.
Price feed built as Cloudflare's worker.

## Overview

Worker contains `currentPrice` method which returns current bETH price in USD. To calculate result methods retrieves current ETH price in USD via chainlink's ETH/USD contract and current stETH/ETH peg from Curve's pool contract and returns product of above values rounded to 8 decimal places. Feed can use multiple Ethereum JSON-RPC nodes to improve fault-tolerance.

Example of request:

```
curl https://beth-price-feed-staging.psirex.workers.dev \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc": "2.0", "method": "currentPrice", "id": 1}'
```

Example of response:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": "2525.37222247"
}
```

## Development And Deployment

Requirements:

- `node.js >= 12`
- `@cloudflare/wrangler >= 1.17`

### Prepare Wrangler

1. [Sign up](https://dash.cloudflare.com/sign-up/workers) for a Cloudflare Workers account.
2. Install the Workers CLI: `npm install -g @cloudflare/wrangler`
3. Login to Wrangler account: `wrangler login` (If the login command get stuck on login, see instructions in this comment to fix the issue: https://github.com/cloudflare/wrangler/issues/1703#issuecomment-773797265)
4. Run command `wrangler whoami` to check that login was succeed.
5. Fill `account_id` in `wrangler.toml` with your `account ID` value.

### Install Dependencies

Navigate to root directory of the project and run `npm install` command

### Setup Environment variables

1. Run `wrangler secret put ETH_RPCS --env ENVIRONMENT_NAME` command to set list of Ethereum JSON-RPC URLs. Example of variable format: `["https://eth-mainnet.alchemyapi.io/v2/foo","https://mainnet.infura.io/v3/baz"]`. `--env` might be one of `staging`, `production`. If omitted would be used development environment.

2. Fill values `SENTRY_PORJECT_ID` and `SENTRY_KEY` in `wrangler.toml` file to activate errors reporting via Sentry. This variables might be get from from the "DSN". The "DSN" will be in the form: `https://<SENTRY_KEY>@sentry.io/<SENTRY_PROJECT_ID>`. DSN might be found in the Sentry project settings.

3. Fill `zone_id` and `route` to publish `staging`/`production` builds. See [deployment instructions](https://developers.cloudflare.com/workers/get-started/guide#7-configure-your-project-for-deployment) for more details. This step might be skipped if only local development supposed.

### Development Server

To start a local server for developing your worker run `wrangler dev`.

### Deployment

To deploy build run `wrangler publish --env ENVIRONMENT_NAME`, where `ENVIRONMENT_NAME` one of `staging`, `production`
