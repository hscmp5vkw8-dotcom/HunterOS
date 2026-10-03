# HunterOS first profile release: review candidate

This separate `codex/account-profile-core` candidate is based on `8e1b7bf916f9141da2cc8a81b139ed3006e1e83c`. The original checkout is unchanged. Full photo/avatar work and both independent-review P2 fixes remain preserved at `20c6776e033b11b1d7297b541dda51f2e1ded4df` on `codex/account-profile`; later HEAD `5864bb9` adds Android documentation only.

The approved first release uses existing HunterOS identity/backend. A top-right Account/Profile button shows signed-in status on tab and stack screens. Signed-out users reach existing sign-in/create-account flows; signed-in users reach an editable profile with email and permanent eight-digit ID. Successful sign-in/confirmation opens the profile. Signup without a session remains at email confirmation, and provider errors remain visible. Existing separate recovery and explicit backup/restore confirmations are preserved.

Screen names remain optional, using existing `social_profiles.name` through `hunteros_social_action('profile')`. Blank uses the existing neutral `HunterOS member` name. Initials are derived from saved names on the profile and accepted Friends/Groups members. No avatar selector, local cosmetic preference, photo picker, uploaded photo, Storage request or new RPC exists. The profile explains that uploaded photos come later. Friends, Groups and Messages open existing routes; Groups selects its tab. IDs, UUIDs, friendships, groups, posts, trips, gear, backups and offline data are not rewritten.

The applicable P2 fix remains: untouched drafts follow saved changes on refresh/focus, including edits made in Friends; intentional unsaved edits survive. Account changes clear drafts/notices and prevent showing previous-account profile/counts. Existing identity-pinned requests and late-result guards are preserved. Photo partial-failure recovery remains on the full branch, with no photo operation here.

No schema/storage migration is required. The migration directory is identical to baseline. Production accounts/permissions/credentials were not changed. Joe's separate account-history issue was not investigated or worked around; no account was recreated.

Completed locally: **111 unit tests, 13 profile browser tests, 10 messaging/social browser tests, one offline-workspace browser test**, TypeScript, online Expo compatibility, web/iOS/Android exports, native permission inspection and `git diff --check`. Account/social browser checks intercept synthetic identities/API calls and block other external traffic. Tests cover auth/confirmation/errors, optional names/stable IDs, clean/dirty draft refresh, save failure/retry, service failure/refresh, account switch, peer initials and ignoring photo metadata with no new RPC/Storage request, offline preservation and narrow phone/tablet layout. Browser emulation and native exports are not installed-device acceptance. There is no lint command; TypeScript and diff checks are applicable static validation. Prepared CI includes profile/messaging checks but was not pushed or remotely run.

Picker/manipulator and photo-only PGlite dependencies were removed. Five Expo patch-range updates recommended by the compatibility check remain. Generated configuration has no photo-library/microphone description, preserves barcode-camera access and blocks Android audio/broad-media permissions. Actual signed binary permissions still need inspection. Synthetic export/check files are excluded from EAS upload.

From `mobile`:

```powershell
npm ci
npm test
npm run typecheck
npx expo install --check
$env:EXPO_PUBLIC_SUPABASE_URL='https://hunteros-test.invalid'
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='synthetic-public-test-key'
$env:EXPO_NO_TELEMETRY='1'
npx expo export --platform all --output-dir dist-profile-test
npm run test:profile:web
$env:HUNTEROS_TEST_WEB_ROOT='dist-profile-test'
npm run test:messages:web
```

Windows uses installed Chrome and externally started local servers, because managed-server teardown is restricted. Profile config uses `HUNTEROS_REUSE_LOCAL_SERVER=1`; existing regression specs use an ignored local config with original ports. The synthetic export must never be distributed. Screenshots are fixture browser previews, including signed-out Home, profile, confirmation, 320-pixel phone and tablet.

Exact release gates are in [ANDROID-PROFILE-RELEASE.md](ANDROID-PROFILE-RELEASE.md) and [IOS-PROFILE-RELEASE.md](IOS-PROFILE-RELEASE.md): independent review/integration authorization, current counters, existing signing/environment and free quota, signed artifacts and physical-device upgrades, then separate internal distribution approval. Source remains 0.7.0/native 13 until approved numbering. No signed build, push, merge, submission, deployment or publication occurred. Installed apps have not received the feature. No paid test backend or Storage HTTP gate is needed for this release; those full-photo gates remain deferred on the preserved branch.
