# HunterOS 0.5.0 (9) beta release

Status verified September 26, 2026 at approximately 03:01 UTC. This release adds the expanded catalog and photos, combined filters, reusable loadouts and Off-road planning for ATVs, UTVs and 4x4 trucks/Jeeps. Feature details and compatibility notes are in [OUTDOOR-EXPANSION.md](OUTDOOR-EXPANSION.md).

## iPhone

- [EAS build](https://expo.dev/accounts/hunteross-team/projects/hunteros/builds/ae98b01e-2320-470e-85d8-3036097db82a) finished at 02:34:17 UTC.
- [Submission](https://expo.dev/accounts/hunteross-team/projects/hunteros/submissions/0044a5b5-2148-4d2f-829b-808cc6516902) finished at 02:34:55 UTC. Do not upload it again.
- Apple build `4c600966-2dab-4e0a-9931-15bde5e019be` is VALID. Team (Expo) is assigned and testing internally. Private Family Beta is assigned and **Waiting for Review** (`WAITING_FOR_BETA_REVIEW`) as of September 26 at 03:00:21 UTC.
- Automatic tester notifications are enabled and new What to Test notes are saved. Existing reviewer details, app descriptions and older builds were preserved.
- Family Beta download availability still depends on Apple approval. This is not a public App Store release.

## Android

- [EAS build](https://expo.dev/accounts/hunteross-team/projects/hunteros/builds/4d39c963-47f9-4648-88f6-b4a1fec4ebc4) finished at 02:41:17 UTC.
- The signed AAB is archived and statically checked. Existing package, version code 9 and public signing certificate match expectations; the app is non-debuggable and blocked audio/media permissions remain absent.
- Google Play internal release 3, `0.5.0 (9) - Loadouts and off-road`, is **Available to internal testers**. The owner completed upload and publication from their phone; the release was verified after reloading Play Console at approximately September 26, 03:01 UTC. Play displays "Released on Sep 25 8:59 PM" in MDT, equivalent to September 26 at 02:59 UTC.
- The active internal release is **0.5.0 (9)**. Play shows app bundle 9 (0.5.0), attached native debug symbols and availability on 18,746 devices; previous bundle 8 is deactivated. The release notes match the new features. Keep the existing tester list and [opt-in link](https://play.google.com/apps/internaltest/4701644933804462998).
- Enrolled Android testers can install or update through the existing Play test link. Publication is complete; do not upload or publish this build again. Play availability does not verify physical installation, automatic delivery timing or preservation of device data.

## Source, artifacts and checks

- Runtime source: `01f02b4851cb1b0406d7a241537b7b2fc9e2ec36`; counter record: `854f33fd72ee9121ef3eedd27b0841718e0b3e96` on `codex/outdoor-loadouts-offroad`. Main was not changed.
- iOS IPA: 22,427,140 bytes; SHA256 `4741c492870619cd957232afb3ce4efcebe9e3c942f16d93a63a315179bc9152`.
- Android AAB: 88,449,181 bytes; SHA256 `8d3dcbe955dde8430809b7685bd2aefb1c8a0253cb030f87a8869909c37e2438`.
- Both archives and private release evidence are retained under the operator workspace `outputs/HunterOS-v0.5.0-build9/`.
- Feature CI passed 93 tests, TypeScript, Expo dependency checks, all-platform exports and browser workflow checks. Static IPA/AAB identity and permission checks passed. Physical installation, native links and device upgrade preservation remain unverified.

## Supporting service

HunterOS `product-import` deployment 2 is live on the existing project. Persisted combined source SHA256: `eeaef511abdb16a65cc48fa016f13539c36478fd1bebb1647943e8115821c738`. JWT verification, confirmed-user checks and rate limits remain enabled. Preflight, public catalog read and denial checks for unauthenticated imports/private metadata passed. No database migration or other project changes were made.

Workspace backups now use version 2. Export a backup before device testing and update all devices to 0.5.0 before restoring a new backup. Cloud upload/restore remains manual.
