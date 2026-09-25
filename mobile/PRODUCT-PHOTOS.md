# Manufacturer pictures and shared products

Version 0.4.2 adds 57 manufacturer photo references to the bundled catalog (63 of 131 configurations now pictured). Existing weights/prices are not marked verified by the photo import. Image URLs remain external reference previews; commercial image permissions still need vendor confirmation before public store launch.

## App flow

- Choosing a catalog product carries its picture into the locker and trips. Exact, unambiguous product-name matches in custom gear also attach the catalog reference. Existing gear snapshots without pictures display the newer picture without changing personal weights or notes.
- Add a product for everyone → paste the individual manufacturer page → Find manufacturer picture → confirm the preview → Use picture and share product with everyone. Then Save gear to keep a personal copy. Sign-in with a confirmed email is required for importing/sharing. Unsupported pages can still be entered as private gear.
- Shared product names, brands, source/image links and category come from the importer. Personal names, measured weights, price paid, quantities, notes, account identifiers and trips are never published. A separate private contributor record supports correction/removal requests.
- The shared catalog refreshes when opened (at most once per minute), with a manual refresh button and a local cache. New shared products do not require another app release after testers install 0.4.2. Cached product details work offline; images still require their external host.
- Use Keep this product private for a personal reference. Sharing does not overwrite existing catalog entries. Duplicate canonical manufacturer links reuse the existing shared record. A variant-specific link is a distinct reference; verify the pictured configuration before sharing.

## Server

Apply `supabase/migrations/20260925_community_products.sql`, then deploy `supabase/functions/product-import`. The dashboard deployment bundles `source.ts` followed by `index.ts` with its relative import removed. Preserve both source files in Git. Legacy JWT verification remains enabled; the handler additionally calls Auth getUser, requires email confirmation, and enforces a database-backed 60-request/user/day limit. Built-in SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY environment values stay server-side.

Only allowlisted manufacturer HTTPS pages can be fetched. Redirects stay on the same manufacturer; credentials/ports are rejected. Lookup is bounded to 12 seconds/4 MB. JSON-LD product/variant imagery takes priority over social previews; generic logos and unrelated image hosts are rejected. No page scripts execute and no client-supplied image or product description is trusted for publication.

`community_products` exposes only id, product JSON and created_at for published rows. Direct client writes and publication/rate-limit RPCs are denied to anon/authenticated roles. `product_contributors` and `product_import_limits` are private. Operators can hide a bad product by setting its status to hidden; it disappears on a successful refresh. Existing personal snapshots remain under their owners' control. Corrections can be requested through Feedback or support@gethunteros.com.

## Validation

58 unit checks (15 new photo/import/privacy checks), TypeScript, and Android/iOS/web exports passed during implementation. All 57 distinct bundled image URLs returned an image response. Live browser import, publication, anonymous shared read, private field separation and locker display were checked using the real Exo K4 2200 page. Physical phone/upgrade tests are separate from browser verification.

Photo expansion sources and dates are recorded per product in `data/photo-overrides.json`; run `npm run catalog` to regenerate the catalog. Do not change photo-only entries to source-checked specification status.
