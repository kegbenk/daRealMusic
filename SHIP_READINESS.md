# daRealMusic Ship Readiness

This file is the operational gate for deciding whether the current `daRealMusic` build is ready to ship or redeploy.

## Required Smoke Checks

Run these before a production deploy:

1. syntax check:
   - `node --check index.js`
2. dependency install check:
   - `npm install`
3. server boot check:
   - start the app with `.env` or `.env.example` values and confirm the process binds without crashing
4. homepage check:
   - load `/` and confirm the artist page renders
5. fan capture check:
   - submit a drop signup and verify local capture artifacts update
6. campaign report check:
   - `GET /api/drop-campaign`
   - `GET /api/fan-capture-report`
7. payment path check:
   - verify Stripe env vars exist in the target deploy
   - create a test checkout session if Stripe is enabled
8. post-purchase path check:
   - verify `/api/download`, `/api/redownload`, and `/api/supporter-library`
9. asset delivery check:
   - confirm S3 metadata load and CloudFront media URLs resolve
10. deployment pipeline check:
   - confirm GitHub Actions deploy secrets are present and the target Lightsail service can restart cleanly

## Current Local Assessment

As of 2026-04-14, this repo looks close to shippable, but ship readiness still depends on runtime validation of:

- AWS credentials and bucket access
- Stripe secrets
- actual server boot
- purchase and supporter-library flows

## Checks Completed On 2026-04-14

Completed locally in this workspace:

1. `node --check index.js`
   - passed
2. local boot with dummy non-production env
   - passed
3. `GET /`
   - returned `200`
4. `GET /api/drop-campaign`
   - returned `200`

Observed notes:

- the app booted successfully without real AWS or Stripe secrets when given dummy development values
- the campaign endpoint returned a valid default campaign payload
- the app still uses AWS SDK for JavaScript v2 and emits the standard maintenance-mode warning on startup

Still not validated here:

- real S3 access
- CloudFront media delivery
- Stripe checkout session creation
- purchase/download/re-download flows
- supporter-library flow against real purchase data
- production deploy and service restart on Lightsail

## Ship Gate

Do not call the current build ready if any of the following are unknown:

- app boot in the target environment
- checkout session creation
- download and re-download flow
- fan capture persistence
- media delivery from S3/CloudFront
