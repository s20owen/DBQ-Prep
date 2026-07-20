# DBQ JSON Dataset

Generated from the VA public DBQ inventory page on 2026-07-20.

## Contents

- `_inventory.json` lists every public document found, source PDF URLs, local JSON paths, and DBQs VA marks as not available for public use.
- One JSON file per public VA DBQ/document.
- `non-public-*.json` files are research-derived substitutes for DBQs VA lists as not available for public use.
- Source PDFs are stored in `sources/dbq_pdfs/` for traceability.

## Schema Highlights

- `source`: VA source metadata, PDF URL, local PDF path, page count, update date/version when present.
- `exam_question_categories`: reusable C&P-prep categories for diagnosis, nexus/service connection, and functional impact.
- `dbq_criteria`: extracted DBQ prompts grouped into diagnosis, medical history, symptoms/signs/findings, frequency/duration, severity, flare-ups, and functional impact.
- `sections`: normalized DBQ sections and their extracted prompts/checklist items.
- `cheat_sheet_use`: suggested truthful user inputs for later auto-generated exam prep sheets.

## Guardrail

This dataset organizes official DBQ prompts. It is not medical advice, legal advice, a diagnosis tool, a nexus opinion, or a disability-rating predictor.

The `non-public-*.json` files are not official VA DBQs and should never be presented as completed VA forms. They are preparation aids built from public VA/eCFR criteria and adjacent public examination concepts.
