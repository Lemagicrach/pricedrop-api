# Post-Change Checklist

Use this checklist after implementing new features or fixes to keep the PriceDrop API reliable. Each item is intentionally specific so nothing is missed before opening a pull request or deploying.

## 1. Verify Code Quality
- [ ] **Run automated tests**: `npm test`
- [ ] **Check TypeScript builds** (if applicable): `npm run build`
- [ ] **Lint the project**: `npm run lint`
- [ ] **Review new files for secrets** and ensure `.env*` files are ignored

## 2. Validate API Behaviour
- [ ] **Start the local server**: `npm run dev`
- [ ] **Hit the health endpoint** to confirm the service boots: `curl http://localhost:3000/api/health`
- [ ] **Exercise the modified endpoints** using sample payloads (see `docs/openapi.yaml` for reference)
- [ ] **Capture sample responses** to confirm schema compatibility

## 3. Update Supporting Assets
- [ ] **Document new functionality** in `README.md` or the relevant file under `docs/`
- [ ] **Update integration partners** (RapidAPI, Supabase, etc.) if request/response contracts changed
- [ ] **Revise environment variable docs** when new configuration is required

## 4. Prepare the Release
- [ ] **Increment version metadata** where necessary (package.json, changelog)
- [ ] **Summarize changes** in the pull request description with testing evidence
- [ ] **Tag stakeholders** or reviewers responsible for the affected modules

## 5. Monitor After Deployment
- [ ] **Check Vercel/Supabase dashboards** for anomalies within the first deployment hour
- [ ] **Review logs and alerts** (Sentry, RapidAPI analytics) for new errors
- [ ] **Communicate completion** to the team with any follow-up actions

Keep this list updated as the project evolves so it remains a dependable reference for future work.