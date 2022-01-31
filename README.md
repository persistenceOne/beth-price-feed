# bATOM/USD JSON-RPC Price Feed

Repository contains implementation of bATOM/USD JSON-RPC Price Feed.
Price feed built as Cloudflare's worker.

## Overview

Worker contains `currentPrice` method which returns current bATOM price in USD rounded to 8 decimal places.

bATOM price calculation based on a next formula: `bATOMPrice = ethPrice * stETHRate / bATOMRate`, where:

- `ethPrice` - current ETH/USD price retrieved from the Chainlink's ETH/USD feed contract
- `stETHRate` - current stETH/ETH spot price retrieved from the Curve stETH pool contract
- `bATOMRate` - current stETH/bATOM rate retrieved from the AnchorVault contract. Always greater than or equal 1.

Feed can use multiple Ethereum JSON-RPC nodes to improve fault-tolerance.

Example of request:

```
curl https://batom-price-feed-staging.psirex.workers.dev \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc": "2.0", "method": "currentPrice", "id": 1}'
```

Example of response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "2525.37222247"
}
```

## bATOM Safe Price Validation

For the resulting bATOM price value (`bATOMPrice`) and for each value of: `ethPrice`, `stETHRate`, `bATOMRate` might be added validations to check that values belong to the allowed range. For each of the above values might be set next validations:

- `maxValue` - maximum value which might be reached
- `minValue` - minimum value which might be reached
- `maxDeviations` - an array of max deviations in percent. Each element will be compared to element from reference values array at the same index.

Reference values - it's an array of values of `bATOMPrice`, `ethPrice`, `stETHRate` and `bATOMRate` taken from different blocks. The number of such reference values and block numbers where to retrieve values from might be set via ENV variable `DEVIATION_BLOCK_OFFSETS` in wrangler.toml file.
`DEVIATION_BLOCK_OFFSETS` must contain a valid JSON array of numbers (empty array is allowed).

Example of `DEVIATION_BLOCK_OFFSETS` value: `[10000, 1000, 100]` - use three points as reference values, with block numbers: `[currentBlockNumber - 10000, currentBlockNumber - 1000, currentBlockNumber - 100]`.

Validations for values `bATOMPrice`, `ethPrice`, `stETHRate` and `bATOMRate` might be set via next corresponding ENV variables in wrangler.toml file:

- `BATOM_RATE_LIMITS`
- `BATOM_PRICE_LIMITS`
- `STETH_RATE_LIMITS`
- `ETH_PRICE_LIMITS`

Each of these variables must contain a valid JSON string of next type:

```typescript
{
  maxValue?: number | string;
  minValue?: number | string;
  maxDeviations: (number | string)[];
}
```

Example of declaration of validations for `BATOM_PRICE_LIMITS` in wrangler.toml file:

```
BATOM_PRICE_LIMITS = '{"maxValue":3100,"minValue":"3000","deviations":[20.5,15,5]}'
```

which requires that the value `bATOMPrice` variable contains in the range [3000,3100], and deviation from reference blocks less than 20.5 % for value with zero index, 15 with index equal to one, and 5 % with index three.

When some validation of price safety fails, an error will be returned instead of a default response.

Example of response with an error when `bATOMPrice`'s max value validation failed:

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "message": "Unsafe Price: value of \"bAtomPrice\" too high",
    "code": -40001,
    "data": {
      "maxValue": "3100",
      "currentValue": "3324.64747392728265104149"
    }
  }
}
```

Example of response with an error when `bATOMPrice`'s min value validation failed:

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "message": "Unsafe Price: value of \"bAtomPrice\" too low",
    "code": -40002,
    "data": {
      "minValue": "3400",
      "currentValue": "3324.8884429858988432267"
    }
  }
}
```

Example of response with an error when `bATOMPrice`'s max deviation validation failed:

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "message": "Unsafe Price: Max deviation of \"bAtomPrice\" exceeded",
    "code": -40003,
    "data": {
      "maxDeviation": "2",
      "currentDeviation": "4.278974120495502111",
      "currentValue": {
        "block": 13082521,
        "value": "3324.64747392728265104149"
      },
      "referenceValue": {
        "block": 13076121,
        "value": "3182.38666892022678037954"
      }
    }
  }
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

1. Run `wrangler build` to add encrypted env variables.

2. Run `wrangler secret put ETH_RPCS --env ENVIRONMENT_NAME` command to set list of Ethereum JSON-RPC URLs. Example of variable format: `["https://eth-mainnet.alchemyapi.io/v2/foo","https://mainnet.infura.io/v3/baz"]`. `--env` might be one of `staging`, `production`. If omitted would be used development environment.

3. Fill values `SENTRY_PORJECT_ID` and `SENTRY_KEY` in `wrangler.toml` file to activate errors reporting via Sentry. This variables might be get from from the "DSN". The "DSN" will be in the form: `https://<SENTRY_KEY>@sentry.io/<SENTRY_PROJECT_ID>`. DSN might be found in the Sentry project settings.

4. Fill `zone_id` and `route` to publish `staging`/`production` builds. See [deployment instructions](https://developers.cloudflare.com/workers/get-started/guide#7-configure-your-project-for-deployment) for more details. This step might be skipped if only local development supposed.

### Project Build

Run `npm run build` command to build the current version of bATOM price feed.

### Development Server

To start a local server for developing your worker run `wrangler dev`.

### Deployment

To deploy build run `wrangler publish --env ENVIRONMENT_NAME`, where `ENVIRONMENT_NAME` one of `staging`, `production`

#### publish helper `bash` script

To make it easier to publish the worker:

- copy `sample.env` to `.env`, change the values
- fill all described above config settings in `wrangler.toml`
- to publish in staging environment - run the `./publish.sh` script without params
- run `./publish.sh production` script to publish in production

### Testing

To run tests:

- Run local Ethereum RPC node on address: `http://127.0.0.1:8545/`. For example: `npx hardhat node`.
- In other console run command: `npm run test`
