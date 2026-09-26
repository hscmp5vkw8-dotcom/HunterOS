# HunterOS 0.6.0 social beta

The home screen offers Recommended, Popular, Friends and New releases, followed by the main app tools. Existing trips are under Your trips and the header's Trips link. Accounts reuse the existing verified-email authentication and manual cloud-backup flow.

## Sharing model

- A person chooses a display name and exchanges a random, replaceable friend code. There is no public user directory. Requests require recipient acceptance.
- Owners create private groups and invite accepted friends. Invitees must join before seeing members or posts. Only owners invite or remove members. Members can leave; owners can close a group.
- Product pages let people share a product ID and an optional note of up to 500 characters with accepted friends or one joined group. Trips, locations, locker contents and backups are never attached.
- People can remove their posts, block friends or group members, and report a post through the existing private feedback channel with the post reference prefilled. Reports are manually reviewed; automatic moderation is not implemented.
- Removing a friend revokes friends-only visibility. Group membership is separate. Blocking suppresses posts in both directions, including groups. Leaving/removal deletes that member's group posts; closing a group deletes its posts.
- Popular contains explicit account-linked like/use votes, aggregated publicly only after at least three distinct contributors for that product. Names and account IDs are not in the public response. Votes can be withdrawn.
- Recommended uses local saved categories. New releases uses operator-curated actual release dates and HTTPS sources, never catalog refresh timestamps. No seed votes, users or release claims were invented.

## Backend and limits

`supabase/migrations/20260926_private_social.sql` was applied to the existing HunterOS project on September 26, 2026. The nine new tables have RLS enabled and no direct client table grants. Private RPCs require an authenticated caller; mutations also require a confirmed email. Functions use an empty search path and explicit caller checks. Existing workspace policies were not changed.

Live checks confirmed all nine tables are private, anonymous callers cannot execute private RPCs, and the aggregate feed RPC is callable. The migration is additive and idempotent. It uses a global mutation advisory lock suitable for this small beta; revisit before substantial growth. Limits: 20 friend-code attempts/day, 30 posts/day, 20 groups owned, 50 members/group, 500 active product picks/account, latest 100 visible posts.

Client requests time out after 15 seconds. Private results are held in memory, cleared on sign-out/account change/blur, and guarded against stale requests. Mutations are serialized per screen. Post creation is not idempotent across an ambiguous network timeout: check the feed before retrying.

## Validation

- 99 unit tests pass, including recommendation, popularity, real-release-date and account-switching request cases. Social requests pin the initiating account token, reject a different account before dispatch, and discard responses after an account change.
- TypeScript passes. Android, iOS and web exports succeed; native cloud build results are recorded in the handoff.
- 89 isolated PostgreSQL access checks pass, covering invitations, acceptance, outsiders, blocking, group revocation, vote thresholds, rate limits and denied direct table reads. The migration is applied twice in this test.
- Browser checks cover phone layout, feed switching, signed-out friend/account gates, catalog/product navigation, saved favorites, trip creation and packing persistence. Live signed-in UI flows with two real accounts and physical-phone acceptance remain outstanding.

Run the database suite with Node and `@electric-sql/pglite` installed separately, passing its absolute `dist/index.js` path as the optional first argument. It uses only synthetic users in an isolated database. It never connects to production.

## Google Play closed testing

The existing Alpha track has a 0.5.0 (9) draft, United States targeting, the existing three-member HunterOS family beta list, and support@gethunteros.com for feedback. No closed release has been published; no tester is opted in yet. The 0.6.0 candidate is a separate build until inspected and selected for a release.

Saved app information: no ads, no financial features, nutrition/meal planning health declaration, not a government app, Sports category and support email. The default English listing name and descriptions are saved as a draft. Required graphic assets, target audience, content rating, app access, data safety and public privacy/deletion information remain unfinished. Do not claim closed testing has started or share the disabled opt-in link as usable.

Before wider distribution, complete the public policy/deletion process, UGC rules and review access, store declarations and native-device checks. Accounts, posts and backups are administered by the operator; this implementation is not a finished public-release privacy program.
