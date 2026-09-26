# Outdoor and four-wheeling catalog expansion

Checked on September 25, 2026. The generated catalog contains **171 products**: all **131 original configurations**, plus **40 new products**. **129 products** have manufacturer image references, up from 63 bundled references. The 66 additional pictures cover all 40 additions and fill 26 original picture gaps. **42 original homepage purchase links** now open checked product pages.

## Reproducible sources

- `catalog-source.json` is the untouched original source. SHA-256: `142405863194d6bc18b6f6294e2d99413a1e955ac704d58e6ab8d7731b50dd4c`.
- `photo-overrides.json` retains the existing picture and weight corrections.
- `catalog-activities.json` adds curated browsing tags to original records without changing their original source, identity, pictures, specifications, or prices.
- `catalog-additions.json` holds 40 stable, separately named product records. Their `sourceURL` and `purchaseURL` point directly to official product pages. No affiliate identifiers have been added.
- `catalog-source-audit.json` records the observed official page title, resolved page URL, image URL, content type, image byte count, and timestamp for every addition.
- `catalog-link-overrides.json` repairs 42 original purchase links and adds 26 missing pictures, while keeping the original `sourceURL` and specification provenance intact. `catalog-link-audit.json` records successful checks and failed or mismatched candidates. Seven pages required web retrieval because direct HTML requests were blocked or incomplete. All 26 added image URLs were separately fetched successfully.
- `npm run catalog` merges these inputs into `catalog.json` during installation/build. Do not edit the generated file as the source of truth.

## Added products

| Manufacturer | Count | Product coverage | Discovery source |
| --- | ---: | --- | --- |
| Rhino USA | 15 | Recovery rope, traction boards, tree saver, soft shackles, compressor, tire repair/gauge/deflators, tool and cargo storage, UTV transport, shovel | https://www.rhinousainc.com/collections/all-products |
| Leatt | 3 | Moto 7.5 helmet kit, Velocity 6.5 Desert goggles, Moto 2.5 X-Flow gloves | https://us.leatt.com/collections/moto-goggles |
| Sea to Summit | 10 | Daypacks, rain protection, mosquito net, map case, dry bag, spork, cup and pot | https://seatosummit.com/collections/hiking-gear and https://seatosummit.com/collections/ultralight-camp-kitchen |
| GSI Outdoors | 7 | Solo and camp cookware, kitchen tools, bottle, mug and coffee equipment | https://gsioutdoors.com/collections/all |
| Kifaru | 5 | Waist packs, stuff sacks, bear spray pouch and binocular accessory pockets | https://kifaru.net/collections/accessories |

Product links were discovered on official collections or official product search results. Each of the 40 selected product pages was fetched successfully over HTTPS, and its Open Graph image was separately fetched and confirmed to return image content larger than 1 KB. The audit is a point-in-time check; availability, redirects, variants, images and prices may later change. A successful image request does not establish commercial image-use permission.

All 26 pictures added to original products were also reviewed visually for product identity. Cascade Designs' generic Open Graph logo was rejected for QuickDraw and WindBurner; those entries use the actual blue QuickDraw filter and black WindBurner system images from the pages' JSON-LD product variants. Spark and Disco use the explicit 15-degree model images rather than a default image for another temperature variant. The RTIC cooler uses a product-only gallery image instead of its lifestyle header. These replacements retain the 129 pictured-product total. Rejected candidates remain marked in the audit, never in the generated catalog.

## Product data limits

New records intentionally have `null` weight and price because product families may offer several sizes or configurations. They are not zero-cost or zero-weight items. Neither a page fetch nor an image fetch promotes their specifications to verified status. Users should open the product website, choose their configuration, and enter actual weights/prices for their own gear.

Pictures retain the existing `reference-preview` classification with their manufacturer source and observation date. No affiliate relationship or expanded image license is asserted; existing vendor permissions work remains separate. Pictures are remote references, not rehosted commercial assets.

Activity tags describe useful browsing contexts. `atv`, `utv`, and `4x4` are not vehicle fitment guarantees. Recovery equipment, transport straps, tire tools and riding protection require the manufacturer's actual configuration, rating, installation and fit checks. The app does not infer a safe recovery load or substitute catalog tags for those checks.

Original source records and existing specification-review status remain unchanged. Community products continue to arrive through the existing shared catalog; this expansion changes only the bundled catalog and makes no live database changes.

## Original records awaiting an exact product match

The following 18 records retain their original manufacturer website link. They have not been silently replaced by similarly named current products. A retained homepage is a manufacturer reference, not a verified direct purchase link.

| Existing product ID | Reason to retain the original reference |
| --- | --- |
| `x-kuiu-pro-6000` | Manufacturer results now point to ICON 6 6000; the same PRO 6000 product page was not confirmed. |
| `x-seek-outside-cimarron` | Current page is Cimarron 4P 2.0; original revision is unspecified. |
| `x-seek-outside-redcliff` | Current page is Redcliff 6P 2.0; original revision is unspecified. |
| `x-sitka-kelvin-aerolite-jacket` | Candidate product URL returns generic site metadata; exact active product page not confirmed. |
| `x-sitka-mountain-pant` | Current search results return other pants, not a confirmed Mountain Pant page. |
| `x-kuiu-peloton-97-fleece-zip-t` | Search results point to Vital S3 instead of the named Peloton 97. |
| `x-lowa-tibet-gtx` | Current results are Tibet EVO variants; original model identity is retained. |
| `x-swarovski-optik-nl-pure-10x42` | Search found a comparison route; exact direct product route still needs confirmation. |
| `x-maven-s-1a-25-50x80` | The candidate resolves to S1.2S, a different model. |
| `x-cnoc-outdoors-vecto-2-l` | Exact current manufacturer product page not found; thread/size options need confirmation. |
| `x-nitecore-nb10000-gen-3` | Current official store results feature Gen 4; Gen 3 was not substituted. |
| `x-havalon-piranta` | Original name does not distinguish Piranta Edge, Bolt, or other variants. |
| `x-biolite-headlamp-425` | US candidate redirects to the headlamp collection; retained original reference. |
| `x-exped-megamat-10` | Manufacturer now markets MegaMat under revised naming; original model revision remains unconfirmed. |
| `x-gsi-outdoors-pinnacle-dualist-hs` | Current cookware links show Halulite Dualist HS or Glacier Dualist, not the named Pinnacle version. |
| `x-darn-tough-hunter-boot-midweight` | Several cushioning variants match the generic original name. |
| `x-crispi-nevada` | Exact Nevada insulation/model option and current US product page remain unconfirmed. |
| `x-schnee-s-beartooth` | Current Beartooth V3 model/insulation option does not establish the original version. |

The checked LEKI Makalu Lite page is the manufacturer's English-language France page for the exact Makalu Lite model; pricing/shipping may be regional. Other repaired family pages may offer multiple sizes, colors, or temperature ratings. The app retains original unverified reference prices and weights and does not copy new variant prices or mark them verified merely because a link was repaired.
