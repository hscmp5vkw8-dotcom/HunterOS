# Android initials-only profile release plan

Prepared October 2, 2026 for `codex/account-profile-core`, based on `8e1b7bf`. Same shared runtime as iOS: top-right status/button, existing auth/confirmation, permanent ID, optional name/draft reconciliation, initials, Friends/Groups/Messages. No picker, photo controls, persisted avatar preference, new RPC, migration or backend deployment.

Package `com.totalfreedomindustries.hunteros`; EAS project `hunteross-team/hunteros`, ID `be009c48-012c-4220-a8d7-764c090695aa`. Source stays 0.7.0/code 13, with local version management. Read-only EAS history checked October 1 at 23:43:41Z examined all 13 Android records; highest code 13. Latest completed store candidate `495e22fa-83c8-447e-9559-8b1af2c88457` is 0.7.0/code 13 from `8e1b7bf`, without this feature. Current Play counters/availability were not checked; historical code 9 is not current evidence.

Existing tester route: Google Play internal track and [established opt-in link](https://play.google.com/apps/internaltest/4701644933804462998). Keep existing app/tester list/signing; no invitations or rollout have been sent.

| Existing profile | Output/environment | Local increment |
| --- | --- | --- |
| `candidate` | Standalone store AAB; production environment | false |
| `beta-apk` | Standalone internal APK; inherits candidate/production | false |
| `production` | Standalone store AAB; production | true |
| `preview` | Standalone internal APK; preview | true |

Production submit targets internal/draft. Historical uploads used owner's manual Play Console route; current automated credentials are unverified. Do not create them. Historical public signing SHA-256 is `a2c1b8ac1b2f7c3b73a5ad764f5a8e5b0ef56de19ac381fee1804a148c059a43`; confirm current Play signer/approved lineage and actual artifact. Do not export/generate/rotate keys or uninstall to force an upgrade.

1. Independently review core commit/diff and authorize integration with current release/concurrent changes. Check Play uploaded/reserved codes and concurrent EAS jobs. Minimum next code is **14**, subject to these checks; approve user-facing version with iOS and an unused code. Candidate/beta-apk preserve assigned code; production/preview increment it, so setting 14 then using them would yield 15.
2. Approve existing production environment, existing signing and free build quota before jobs. Inspect endpoint/public client key configuration, excluding synthetic export or secrets. No test backend is required. Stop if credentials must be created or any cost is required; do not buy/provision a workaround.
3. With separate build authorization, build controlled `beta-apk` APK and `candidate` AAB with commands below, no auto-submit. CLI 24.7.0 supports frozen credentials/noninteractive operation. Preserve effective environment/source/job IDs/artifacts/SHA-256.
4. Inspect actual package/version/code, standalone/non-debuggable status, compatible signer, supported SDKs and merged manifest. Retain barcode-camera access; no photo-library/audio/broad-media permission expansion. Export/introspection is insufficient to prove final native result.
5. With device/test-account authorization, back up and upgrade a physical existing installation without uninstalling. Verify UUID/permanent ID, friendships/groups, trips/gear/favorites/packing. Test current/oldest supported Android, TalkBack/large text, keyboard/Back, auth/confirmation/recovery/error states, session after restart, blank/long names/initials, save failure/retry, clean/dirty drafts returning from Friends, account switch/offline, Friends/Groups/Messages and barcode scan. No real signup/friend request without separate permission. Record exact device/OS/artifact/screenshots and results. No photo upload tests apply.
6. After acceptance and separate upload/rollout approval, upload verified AAB manually to existing Play internal draft, review disclosures and release to existing testers. Automated submit is optional only with already authorized credentials. Verify actual tester upgrade through existing link. Public publication is outside scope.

Prepared, **not executed**:

```powershell
npx eas-cli@24.7.0 build --platform android --profile beta-apk --freeze-credentials --non-interactive
npx eas-cli@24.7.0 build --platform android --profile candidate --freeze-credentials --non-interactive
# Optional separately authorized internal-draft upload with existing credentials:
npm run submit:android:play -- --id VERIFIED_NEW_BUILD_ID
```

Available: Node 24.21.0/npm, Git, Python, Chrome/Playwright, cached EAS CLI 24.7.0 with successful read-only history. No adb/emulator/Java/Gradle command, standard Android SDK or Android Studio detected; no toolchain installed. No connected device-control tool or Android execution available. Current credential availability/free quota are unverified. Local Android export/generated permission checks passed; no APK/AAB with feature exists. Remaining blockers: review/integration, current Play counters/signing, approved free build route, physical-device acceptance and separate upload/rollout authorization. No Storage staging gate applies.

Official references checked October 2: [Expo versions](https://docs.expo.dev/build-reference/app-versions/), [internal APK distribution](https://docs.expo.dev/build/internal-distribution/) and [Android versioning](https://developer.android.com/studio/publish/versioning).
