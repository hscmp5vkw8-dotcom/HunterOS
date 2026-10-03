# HunterOS tester feedback: QA and beta release plan

Status, 2026-10-03: implementation, local QA and isolated Supabase Edge Runtime verification complete. Beta delivery is authorized; live release-console checks remain unavailable in this executor. Production, store submissions, real user relationships and accounts have not been changed. Native version/build remains the verified baseline 0.7.0 / 14 until current store counters are checked.

## Source and feedback evidence

Work is isolated from the clean build-14 checkout on `codex/tester-feedback-next`, based on `f5b43428b42f711572296216d24276d35d425edb`. Current GitHub main is an ancestor of that baseline; the older social branch is historical. The existing local release checkout remains untouched. See `TESTER-FEEDBACK-NEXT.md` for the approved scope and acceptance criteria.

The parent actually inspected screenshot pixels for the supplied Library IMG_3599 and IMG_3600 screenshots. The screenshots show the Mystery Ranch Pop Up 30 URL and the previous unsupported-manufacturer failure. Local Library screenshot materialization failed because the current Windows helper requires `os.setxattr`; the screenshots were not guessed or locally inspected here.

## Delivered behavior

- Public manufacturer and retailer links import available name, brand, explicit model/SKU/category, source price and currency, image, product/net/pack weight and unit, source attribution and original/selected URL. Structured product graphs, microdata and metadata fallbacks are supported. Explicit variant selection precedes variant-specific values; unknown fields stay blank. Non-USD source prices never become USD silently.
- Review, apply to private editable gear, and explicitly share server-derived source details are separate actions. Existing entered values survive applying. Canonical and variant duplicates, repeated taps, login interruptions, Back navigation, URL changes and account changes are handled. Blocked sites still allow a manual item with its source link.
- A late sign-in or email-confirmation response no longer redirects a user away after the account screen loses focus. A delayed-auth browser regression verifies Back retains the gear draft when authentication completes. The completed-auth case explicitly waits for its profile transition before testing Back, separating the two timings.
- Food imports retain source-stated brand/manufacturer/seller/explicit parent, pack and serving basis, ingredients, allergens and nutrition separately. Serving grams/calories are not package totals. Private corrections survive backups and never alter published source facts.
- Saving a reviewed import collects deduplicated source brand/maker candidates in a private review queue. Retailers are not assumed to make the product; unknown identities stay unresolved. No outreach is sent, affiliate relationship claimed, or commission invented.
- Home exposes the friend inbox and unread count; the inbox has search and All/Unread filters. Existing participant authorization, bilateral blocking and account-change clearing remain in use.
- Food ideas and two dry homemade snack recipes add private consumables to the chosen locker/trip/loadout. Weights, prices and calories remain unknown. Ten four-wheel essentials are labeled suggestions, with a first-aid shortcut and two ordinary kit references. Product links have no claimed referral benefit.
- The privacy screen describes import preview, source sharing and private candidate backups. EAS excludes generated test exports and screenshot evidence.

## Verification evidence

All listed local verification commands exited 0. Logs and screenshot evidence are in the accompanying review bundle.

| Check | Result |
| --- | --- |
| Client TypeScript and strict Edge Function TypeScript | Passed |
| Native Deno check of function and live-import script | Passed, Deno 2.9.7 |
| Official isolated Supabase Edge Runtime v1.77.4 | 9 integration checks passed, including 5 user-worker DNS/TCP/TLS/SSRF/timeout checks; synthetic backend only |
| Deno lint of all 27 changed/new TS/TSX files | Passed; existing `any` convention and React Native explicit JSX newline braces excluded |
| Full client/importer/network unit suite | 140 passed, 0 failed |
| Isolated PGlite message authorization/behavior | 240 passed; synthetic users only |
| Isolated PGlite social authorization/behavior | 89 passed; synthetic users only |
| Existing profile browser regressions | 13 passed, clean process exit |
| Existing core browser regression | 1 passed, clean process exit |
| Existing message browser regressions | 10 passed, clean process exit |
| Feedback regressions, mobile and desktop Chrome | Prior 24 passed; expanded to 26 with deterministic pending-auth Back coverage; final rerun recorded in follow-up evidence |
| Offline Android/iOS/web exports | Passed, final application source |
| Synthetic-service Android/iOS/web exports | Passed, final application source; separate from deliverable offline export |
| Local EAS source archive inspection | Passed; generated exports/test evidence/credentials absent from file contents |
| Read-only production schema/RPC/permission verification | Compatible; import RPCs service-role-only, catalog RLS enabled, existing 20 KB product constraint retained |

Feedback browser cases cover variants, currency, private edits, duplicates, blocked/manual import, repeat saves/imports/food taps, login/Back/stale URL, inbox search/unread/account switch/read-only/blocked/retry/signed-out states, food target isolation, first-aid/essentials, known/unknown candidates and privacy copy. Test traffic uses localhost and a synthetic `.invalid` service; no real users, messages, friendships or blocks were changed.

Actual mobile/desktop screenshot pixels were checked for Home, inbox, import metadata/variants, source food facts/private editor, food recipes, first-aid results, suggested essentials, private candidate states and blocked inbox. Screenshots use synthetic fixture identities and values, not actual user conversations. Mobile Chrome viewport evidence is not a physical iOS/Android installation test.

Three live public-page imports passed using native Deno's pinned TCP/TLS path:

1. `https://www.mysteryranch.com/pop-up-30-pack`: 12 variants, 2.2 kg source weight, selected SKU, USD 425 and image; model/category absent.
2. `https://www.fleetfeet.com/products/gu-energy-stroopwafel`: redirects to the actual waffle page; nine flavor options, selected SKU 124320, USD 1.85, image, GU Energy brand and Fleet Feet seller; legal maker and weight absent.
3. `https://shop.equalexchange.coop/collections/chocolate-bars/products/organic-dark-chocolate-almond-sea-salt-55-cacao`: selected 10 Pack, SKU 18209, USD 39.60, image, ingredients/allergens/nutrition; quoted approximately 3.5 servings per container and 29 g serving remain separate from the 10-pack. Total package weight/calories remain unknown.

These are time-stamped source observations, not price promises. Sites may change, block requests, omit fields or require JavaScript. There is no access-control bypass or paid scraper. The safe fallback is manual entry. DNS validation covers all returned addresses and redirects; native TCP pins the validated public IP, TLS verifies the original hostname, and time/redirect/raw/decompressed-size limits are enforced. Untrusted page content is treated only as data.

The first hosted PR check exposed an existing CI export-cache issue: its offline and synthetic account web bundles had the identical hash, leaving account configuration unavailable and failing 13 profile cases before subsequent suites could run. CI now clears Metro's transform cache when changing backend environment and verifies the synthetic service URL is present before browser tests. The final hosted outcome is recorded separately in the review evidence; local configured profile checks passed.

## Concrete release plan and remaining gates

The user approved delivering to existing beta audiences when ready. That approval does not cover new charges/resources/access/credentials/legal agreements, expanded audiences, public launch or destructive migrations.

1. **Isolated runtime verification passed.** The existing public repository's standard Ubuntu GitHub Actions runner has Docker; no new project, payment, credentials, Windows installation or persistent permission was needed. The probe uses official Supabase Edge Runtime v1.77.4, pinned to linux/amd64 manifest `sha256:fded42ff725708990b1a0803633c2659453259d075c4bec6b4d01dfb82dc055e`. It mounts only function/test sources read-only, drops container capabilities, exposes only localhost, and removes the container on exit. The test-only gateway passes only synthetic backend settings to restricted user workers. No production backend request occurs.
2. **Standalone function bundle is verified.** The first probe identified a genuine boot error: Edge Runtime's module graph resolves type-only imports, so `source.ts` could not depend on the mobile app's `src/types.ts` in a standalone deployment. The shared type now lives in `facts.ts`; mobile code imports the same type. Deploy all four files: `supabase/functions/product-import/index.ts`, `source.ts`, `network.ts`, `facts.ts`. Preserve `verify_jwt=true` and existing auth/rate/publication rules. The corrected source at GitHub commit `06dca1ad1426f744e61fd6469cb9ee9a5c04c11d` passed [runtime run 37145890693](https://github.com/hscmp5vkw8-dotcom/HunterOS/actions/runs/37145890693), with the exact checked-out commit printed in its logs. Its tree `695fffe7e0f969c2326e31e76871eed2c84847d2` matches local commit `215f77ea23b3562f93d4226a9c0aae2b8c9a90b5`. Nine integration checks cover actual worker boot, HTTP methods, auth rejection, synthetic rate denial, private URLs, TLS hostname rejection, mixed DNS, redirect revalidation, timeout, three actual live links, explicit variants and source-only publication excluding private client edits. Auth/RPC are synthetic HTTP contract fixtures; hosted GoTrue/PostgREST and production hosting were not exercised. No SQL migration is required.
3. **Deploy only that reviewed four-file function to HunterOS production within existing beta authorization.** The existing deployed function is ACTIVE version 2 with JWT verification enabled. Its source has been saved locally in the review bundle as `backend-rollback/product-import-v2.ts`; restore that source with the same verification setting if production checks regress. Recheck deployment version/logs and use only an authorized test account for mutating smoke checks. Do not touch actual friends/blocks or unrelated projects/functions. This isolated-test task has made no production access or deployment.
4. **Reconnect authenticated release-console control.** The release verification skill requires current signed-in App Store Connect / Google Play Console state and states: "Stop immediately if no live authenticated browser control is available; report the reconnection requirement instead of guessing or treating an attempted click as success." This Windows executor has no exposed `node_repl` computer-use or browser-control tool. Historical Family Beta / Play configuration and EAS builds do not prove current tester eligibility or availability. Verify current group/track and highest native counters before assigning version/build. The existing EAS account's October 1-November 1 free allowance was read-only verified at 18:14 UTC: 14 Android and 14 iOS builds remained, no overage and $0 build cost. Recheck immediately before a job; no billable build has been started.
5. **Version and sign a fixed candidate from the final committed source.** EAS project `be009c48-012c-4220-a8d7-764c090695aa`, owner `hunteross-team`, identifiers `com.totalfreedomindustries.hunteros`; cached CLI 24.7.0. Current finished iOS/Android EAS builds are build 14 at the baseline commit. Use the existing `candidate` profile with `autoIncrement=false` after choosing verified counters. Reuse existing signing and production environment; do not print credentials or signed artifact URLs. Inspect the APK/AAB/IPA contents and package/version before submission. Current deliverables are compiled JS/Hermes exports, not signed installable binaries.
6. **Submit exact verified build IDs only to the existing beta audience.** Recheck the live Play target: repository submit config says internal/draft; historical closed testing is not proof of the current track. For iOS, separately record submission, Apple processing, assignment to the current existing Family Beta group, review/notifications and tester availability. For Play, distinguish draft/submitted/review/available. A successful upload alone is not a release. Any new charge, access scope, credential, agreement, audience expansion or public launch requires action-time approval.

No production deploy, native signing job or store submission occurred. No APK/IPA or actual tester availability is claimed. The runtime verification gap is closed; authenticated release-console/counter/audience verification remains necessary before native build and beta distribution. No additional general beta-release approval is needed.
