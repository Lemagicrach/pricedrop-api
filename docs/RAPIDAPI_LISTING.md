# Listing PriceDropAPI on RapidAPI

This guide walks you through the final steps required to publish the PriceDropAPI project on the RapidAPI marketplace once your deployment is stable.

## 1. Prerequisites

Before you start the listing workflow, make sure the following requirements are in place:

- ✅ **Production Deployment** – Deploy the API (for example, to Vercel) and verify the endpoints documented in [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md).
- ✅ **Environment Variables** – Supply the production credentials listed in [`README.md`](../README.md#required-environment-variables).
- ✅ **Authentication Middleware** – Keep the RapidAPI authentication middleware enabled (`lib/middleware.js`, `middleware/auth.js`) so marketplace traffic is restricted to RapidAPI keys only.
- ✅ **Monitoring & Logging** – Enable whatever logging you need (Supabase, RapidAPI analytics, Sentry, etc.) for troubleshooting once users begin calling the API.

## 2. Prepare Your RapidAPI Assets

Collect the assets that RapidAPI asks for during onboarding:

- **Listing title & tagline** highlighting eBay tracking, historical pricing, and alerting features.
- **Detailed description** summarising the endpoints that ship with this repository (`/api/v1/products/search`, `/api/v1/products/{id}`, `/api/v1/products/track`, etc.).
- **Documentation snippets** – You can reuse the sample requests from [`README.md`](../README.md#-quick-start-rapidapi) and [`docs/openapi.yaml`](./openapi.yaml).
- **Pricing plan** – Mirror or adapt the plan outline in the README (Free, Basic, Pro, Ultra, Enterprise) and configure request quotas that match your infrastructure.
- **Branding assets** – Logo (square), banner, and contact/support email.

## 3. Create the Marketplace Listing

1. Sign in to the [RapidAPI Provider Hub](https://rapidapi.com/provider/hub).
2. Click **Add New API** and choose **External (REST)**.
3. Supply the production base URL of your deployment, e.g. `https://your-deployment.vercel.app/api`.
4. Import the OpenAPI schema from [`docs/openapi.yaml`](./openapi.yaml) or add endpoints manually.
5. Set authentication to **Header** and require `X-RapidAPI-Key` and `X-RapidAPI-Host` (see `lib/middleware.js`).
6. Configure the pricing plans and quotas you prepared earlier.
7. Publish the listing privately first so you can run end-to-end tests through RapidAPI’s proxy.

## 4. Verify Endpoints Through RapidAPI

After publishing privately:

1. Subscribe to your API as a consumer within RapidAPI.
2. Use the Provider Hub’s **Test Endpoint** feature or the `scripts/test-production.js` helper to ensure requests succeed when routed via the RapidAPI proxy.
3. Confirm error handling behaves as expected (missing headers, invalid keys, rate limiting).
4. Once all tests pass, switch the listing visibility to **Public**.

## 5. Post-Launch Checklist

- Monitor RapidAPI analytics for traffic spikes and error rates.
- Keep pricing and quota configurations in sync with any changes you deploy.
- Update this repository’s README and docs whenever endpoints or response shapes change so RapidAPI consumers have accurate information.
- Respond promptly to support tickets raised via the RapidAPI dashboard.

Following these steps will let you confidently list PriceDropAPI on RapidAPI while keeping the authentication and documentation consistent with the project’s codebase.