# User IDs, friends and direct messages

Every registered account gets a permanent unique eight-digit ID. Existing names and friendships are preserved. New accounts start with an editable "HunterOS member" display name. Account and Friends show the ID; native Share lets a member share it intentionally. IDs identify accounts, not login credentials.

Friends accepts either that ID or an exact registered email address. Requests require recipient acceptance; incoming requests can be declined, outgoing requests canceled, friends removed, and people blocked/unblocked. Lookup is rate-limited and does not expose another person's email or a user directory. Older mobile builds can continue using their UUID friend codes.

Messages is available from Home, Account and Friends. Only accepted friends may send one-to-one text messages. The inbox displays unread counts; threads show timestamps and load older pages. Removal retains read-only history and requires a new accepted request before sending again. Blocking hides the entire conversation in both directions and rejects future sends/requests. Unblocking does not recreate the friendship.

## Storage and delivery

- Apply `supabase/migrations/20260928_user_ids_messages.sql` after `20260926_private_social.sql`. It backfills IDs and installs an account-creation trigger. Both scripts run atomically and the new migration can be rerun without rotating assigned IDs.
- New message tables have RLS enabled and no direct `anon`/`authenticated` table grants. Security-definer functions use an empty search path and explicitly check authenticated caller, confirmed email, participant relationship and blocks. Legacy function implementations are revoked from client roles.
- Private RPCs: `hunteros_message_inbox`, `hunteros_message_thread`, `hunteros_message_action` (`send`, `read`). Existing `hunteros_social_action` accepts `request` with `identifier`; UUID `code` remains compatible.
- Message pages contain 50 records, ordered by server timestamp plus UUID, with a two-part cursor. The client merges overlapping pages by ID. Successful sends are capped at 300/day/account and 2,000 characters/message; friend lookup attempts at 20/day.
- A sender-scoped `client_id` makes retrying the same uncertain send idempotent. The current screen retains its unsent text and key for a manual retry. Leaving/reloading the screen discards that in-memory draft; there is no offline outbox.
- Polling runs every five seconds while Messages is focused and the app is foregrounded. Inbox unread counts use private reading positions. No push/email notifications, presence, attachments or group chats are implemented.
- Private results and drafts clear on account switch and screen changes. Each request pins the initiating token; old responses are rejected after identity/focus changes. Blocking/removal invalidates reads already in flight.
- Messages are access-controlled, not end-to-end encrypted. In-app privacy and the deletion runbook describe message retention and operator access. Keep the public policy and store disclosures current before wider release.

## Reproducible validation

`npm test`, `npm run typecheck`, and `npm run export` cover the client. The isolated database suites require `@electric-sql/pglite` (pass its absolute `dist/index.js` path as the first argument): `node supabase/tests/social-access.mjs` and `node supabase/tests/messages-access.mjs`. They use synthetic accounts and never connect to the live project.

Browser tests use `playwright.messages.config.ts`, a local export, synthetic sessions and intercepted RPCs. Export to `dist-social-test` with `EXPO_PUBLIC_SUPABASE_URL=https://hunteros-test.invalid` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_browser_test`, then run with `HUNTEROS_TEST_WEB_ROOT=dist-social-test` and `HUNTEROS_TEST_SUPABASE_URL=https://hunteros-test.invalid`. The fake export is excluded from Git and cloud builds. A passing synthetic test is not a physical-device or real-account delivery check.

Use `EXPO_NO_DOTENV=1` and Expo export `--clear` for the fake build so a cached real endpoint cannot replace the test endpoint. `PLAYWRIGHT_CHANNEL=chrome` uses an installed Chrome in a separate temporary test profile when Playwright's bundled Chromium is unavailable.

## Verified September 28, 2026

The additive migration is deployed to the existing HunterOS backend. Aggregate verification found two auth accounts and two unique eight-digit IDs, with the existing friendship preserved. The new-account trigger is enabled; all three new message tables have RLS, direct client reads are denied, anonymous message RPCs are denied, and legacy mutation bypass is denied.

Validation: 107 client tests, 240 messaging database checks, 89 existing social database checks, TypeScript, and 10 mocked browser flows pass. Android/iOS/web exports pass. Browser tests cover ID/email requests, accept/decline/remove/block/unblock, private inbox/read counts, duplicate-safe retry, account switching, and delayed reads after blocking. No real user message was sent during verification. Native install and real two-account delivery remain separate acceptance checks.
