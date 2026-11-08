# Compound Vault

A static, reference-only educational library. No store, sales, sourcing, dosing, cycles or protocols. Educational only—not medical advice.

## View locally

No build step is required for the committed website. Use an HTTP server (fetch does not work from `file://`):

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Node is required only to regenerate the data.

## Add hundreds of compounds

1. Edit `data/compounds.csv` in a spreadsheet or CSV editor. This is the source of truth. Export as UTF-8 CSV. Quote fields containing commas, quotes or line breaks; embedded quotes use doubled quotes.
2. Add one row per compound with a unique lowercase hyphenated slug. Do not add dosing or protocol fields. Use `PLACEHOLDER – verify` for unresolved facts.
3. Run `node scripts/csv-to-json.js`. The dependency-free importer checks columns, slugs, classes, risk tags, reference URLs and related IDs, then produces `data/compounds.json`.
4. Review all claims and references with qualified clinical/legal editors. Test search, the page and risk tags locally.
5. Commit the CSV **and generated JSON**, then push to `main`. GitHub Pages serves the updated site. Every row automatically gets `compound.html?c=slug`; no new HTML file is needed.

This is the bulk-import flow; there is no public upload endpoint or backend. Do not expose credentials or patient information. At hundreds of entries the single JSON file remains simple and fast; consider a search index or static generation for thousands.

## CSV columns

| Column | Format / purpose |
| --- | --- |
| slug | Unique lowercase URL ID, e.g. `testosterone` |
| name | Display name |
| aliases | Semicolon-separated alternative names |
| class | `anabolic steroid`, `SARM`, `peptide`, `PCT/ancillary`, or `other` |
| structure_image | Optional HTTPS image URL; empty shows placeholder. Verify licensing and scientific accuracy. |
| half_life | Formulation-specific context, or `PLACEHOLDER – verify`. Never a dosing guide. |
| mechanism | General established mechanism and uncertainty |
| effects_studied | Studied or claimed effects with an explicit evidence-strength note |
| side_effects | General adverse effects and uncertainties |
| long_term_risks | Long-term evidence and gaps |
| legal_ca | Canada status, including verification needs |
| legal_us | US federal/state status, including verification needs |
| legal_uk | UK status, including verification needs |
| related | Semicolon-separated existing compound slugs; not combination advice |
| references | Semicolon-separated `title|https://url` pairs; do not include semicolons inside URLs/titles |
| risk_tags | Semicolon-separated `liver`, `lipids`, `blood_pressure`, `hematocrit`, `hpta`, `mood`, `unknown_human_data` |

The `scripts/seed.py` script records the initial seed only: **do not rerun it after editorial changes**, as it replaces the CSV. `scripts/pages.py` similarly records the initial HTML generation; edit HTML directly afterward.

## Structured data and future static generation

`compound.html` injects JSON-LD per compound at runtime using the shared template. It does not claim a review, approval or verified legal classification. Search engines may not index query-string pages or client-rendered metadata reliably. For production SEO, generate `/compounds/<slug>/index.html` with unique titles, canonical URLs, descriptions, sitemap entries and JSON-LD in the initial HTML. Use this pattern, replacing every placeholder from the reviewed CSV data:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Drug",
  "name": "COMPOUND NAME",
  "alternateName": ["ALIAS"],
  "drugClass": "COMPOUND CLASS",
  "description": "REVIEWED MECHANISM",
  "legalStatus": [{
    "@type": "DrugLegalStatus",
    "applicableLocation": {"@type": "Country", "name": "Canada"},
    "name": "VERIFIED LEGAL STATUS OR EXPLICIT PLACEHOLDER"
  }],
  "url": "https://YOUR-SITE/compounds/SLUG/"
}
</script>
```

## Editorial replacements required

- All half-life fields need formulation-specific primary-source verification; no unsupported numerical values are supplied.
- All Canada/US/UK legal fields are explicit placeholders; obtain current jurisdiction-specific legal review.
- Molecular structure images, licenses and attribution.
- Compound-specific primary research citations, evidence grading, clinical review and review dates. Current regulator/NIDA references are background sources, not full claim-level citations.
- Verified regional blood-testing, physician and harm-reduction resource links. `#` cards are intentionally inert.
- Contact email, editorial ownership, privacy/accessibility policies and final brand sign-off. DNA SVG artwork is included.
- Expand the ten seed entries. PCT/ancillary and other filters intentionally have no entries yet.

## Risk checker limits

The checker shows the union of curated risk tags only. It does not calculate interactions, recommend combinations, certify safety or replace clinical care. Testing suggestions are discussion topics for a physician, not a universal testing plan. PSA is explicitly conditional, not routine for everyone. Unknown evidence is treated as uncertainty, not reassurance.

## Deployment

GitHub Pages: branch `main`, root `/`. Relative asset paths work under `/compound-vault/`. No external analytics or forms are included. Google Fonts loads Inter; system sans-serif is the offline fallback.
