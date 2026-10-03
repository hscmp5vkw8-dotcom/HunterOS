# iOS initials-only profile release plan

Prepared October 2, 2026 for the same `codex/account-profile-core` candidate as Android. Account/profile entry, existing auth/confirmation, permanent ID, optional name/draft reconciliation, initials and existing Friends/Groups/Messages are included. Photos/persisted avatar choices remain deferred on the preserved full branch. No schema/bucket/permission/backend deployment applies.

Bundle `com.totalfreedomindustries.hunteros`; EAS project `be009c48-012c-4220-a8d7-764c090695aa`; App Store Connect app ID `6815313376`. Recorded tester route is existing TestFlight Family Beta; current group membership, processing/review and availability are unverified and unchanged.

Read-only EAS iOS history checked `2026-10-02T00:05:24Z` examined 11 records. Highest source/history build 13; latest completed store candidate `c073b57f-7cba-4ce9-82f0-5d567faad3e1`, 0.7.0/build 13, baseline `8e1b7bf`, lacks this feature. Source stays 0.7.0/build 13. **14 is minimum next build**, subject to current App Store Connect uploaded/reserved counters and concurrent jobs, which were not checked.

`candidate` extends production/store/environment with local auto-increment false. `production` auto-increments. `simulator` extends preview for simulator-only execution and cannot be used in TestFlight. Preserve existing private TestFlight route, without alternate ad hoc credentials or registrations.

1. Independently review core diff and authorize integration with current release/concurrent changes. Read current Apple/EAS counters, approve coordinated user-facing version and unused build, and assign it for non-incrementing `candidate`. Do not reuse 13 or claim 14 is reserved.
2. Approve existing production environment, distribution signing/provisioning and free EAS quota before a job. Freeze credentials; do not create/rotate certificates/keys/profiles/capabilities. Verify bundle uses existing HunterOS endpoint/public client key, excluding synthetic export/secrets. Stop if access/quota is unavailable or cost/credential creation is required.
3. Under separate build authorization, execute prepared candidate command below without auto-submit. Preserve source/environment/job provenance and completed IPA SHA-256. Inspect actual bundle/version/build, device distribution entitlements/provisioning, standalone status and final Info.plist; no photo-library/microphone description, existing barcode-camera retained.
4. With separate submission authorization, upload that exact verified build using existing authorized EAS Submit access or established owner route. EAS Submit uploads to App Store Connect/TestFlight processing, without public App Store publication. `ascAppId` is configured, but current submission credentials are unverified; do not create them. Review processing/compliance/private beta requirements before availability.
5. With device/test-account authorization, back up and upgrade existing iPhone/supported iPad installs through authorized private TestFlight route, retaining data. Verify UUID/permanent ID, social/trips/gear/favorites/packing, persisted session, sign-in/create/confirmation/error/recovery, account switch/offline, blank/long names/initials, failure/retry, clean/dirty drafts returning from Friends, direct Groups/Messages, Dynamic Type/VoiceOver/keyboard and barcode scanning. Use existing authorized fixture accounts; no real signup/friend request without separate permission. Record exact build/device/OS/screenshots/results. No photo-selection tests apply.
6. Separately authorize availability to existing Family Beta testers after acceptance/processing gates. If acceptance first needs controlled private availability, explicitly approve that test distribution. Verify Jacob's installed build/profile behavior before claiming he received it. Public App Store publication requires separate authorization.

Prepared, **not executed**:

```powershell
npx eas-cli@24.7.0 build --platform ios --profile candidate --freeze-credentials --non-interactive
# After exact artifact review and separate submission authorization:
npm run submit:ios -- --id VERIFIED_NEW_BUILD_ID
```

This Windows environment has Node/npm, Git, Python, Chrome/Playwright and cached EAS CLI 24.7.0 with read-only authenticated history. No Xcode/xcodebuild/Apple security command or connected device-control tool; it cannot compile/sign a local IPA. Nothing was installed/provisioned. Local tests, native introspection and iOS export passed, with no signed IPA or installed-device execution. Remaining blockers: review/integration, current Apple counters and signing/access, approved free cloud build, exact IPA submission, device acceptance and separate private availability. No paid test backend or Storage HTTP gate applies. Jacob's installed app is unchanged.

Official references checked October 2: [Expo version management](https://docs.expo.dev/build-reference/app-versions/), [iOS EAS submission](https://docs.expo.dev/submit/ios/) and [internal distribution](https://docs.expo.dev/build/internal-distribution/).
