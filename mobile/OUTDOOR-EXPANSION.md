# HunterOS 0.5.0 candidate — outdoor loadouts and four-wheeling

This branch builds on `codex/product-photos-20260925` (the 0.4.2 source), not the older main branch.

## Delivered

- 171 bundled product configurations: all 131 previous entries and 40 new products.
- 129 products with manufacturer reference images, including 66 additional pictures. The photo audit checks product identity and temperature/configuration where available, not just HTTP status.
- Direct product pages for every addition and 42 repaired legacy purchase links. Eighteen ambiguous or discontinued legacy items retain clearly labelled brand links; the exact reasons are in [the source audit](data/CATALOG-SOURCES.md).
- Combined activity, vehicle, category, brand, product type, photo, favorites, known-value, price and weight filters. Search includes brand, model, option, kind and tags. Numeric sorts keep unknown values last.
- 14 editable starters: two each for hiking, backpacking, hunting, camping, ATV, UTV, and 4×4.
- Multiple named saved loadouts, custom lists, duplicate/edit/delete, catalog and locker additions, and independent trips. A trip can also be saved as a new reusable loadout.
- A dedicated Off-road tab with vehicle profiles, day/overnight loadouts, focused gear categories and saved trail trips.
- Existing local storage, account behavior, scan history, manual cloud backup and shared product catalog preserved.

## Data compatibility

Workspace writes use `hunteros.mobile` version 2. Version 1 backups migrate without dropping trips, gear, favorites, scans or personal measurements. The new version prevents older app versions from silently dropping saved loadouts. Update other devices to 0.5.0 or later before restoring a new backup. Cloud upload/restore remains manual.

Loadout-to-trip and duplicate operations copy product/photo snapshots, assign fresh equipment IDs and reset packing progress. Food/water/fuel quantities remain user controlled; the trip form explicitly asks users to review them for duration and group size.

## Validation

- 93 automated tests pass, including catalog preservation, filter combinations/ranges, backup migration, independent copies, import authorization and source URL validation.
- TypeScript passes.
- Expo iOS, Android and web JavaScript exports pass.
- Chrome phone-size checks: create/rename/duplicate a loadout; save custom measured gear and a pictured catalog item; reload; create independent hiking and UTV overnight trips; save packing progress; change vehicle scope; combine filters; reject inverted ranges.
- Desktop layout and final preview checked separately.
- Physical iOS/Android installation, native external-link handling and airplane-mode cold starts still require device testing.

## Release state

Source and local preview are ready for review. This branch has not been uploaded to TestFlight, Google Play or a public website. Native build counters remain at the prior baseline; the existing EAS profiles increment them for the next build. Check current store counters before submitting.

The product-import Edge Function includes the new categories and observed manufacturer/image hosts. Deploy that function with the app release to enable URL imports for the added brands/categories. No database migration or new secrets are required, and no live backend changes were made here.

Manufacturer pictures remain external reference previews. No new affiliate relationship or commercial image license is claimed. Unknown prices and weights remain blank, and vehicle tags describe discovery rather than certified fitment.

