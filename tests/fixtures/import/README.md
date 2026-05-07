# XLSX import homologation fixtures

These workbooks are real NAABSA BQS examples used as golden samples for parser regression tests.

The expected values in `expected-bqs.json` are the values currently treated as homologated for import:

- report identity fields such as vessel, port and survey date;
- tank table counts for vessel/barge opening and closing;
- final BDN, surveyor figure, MT difference and percent difference.

Use this folder as the first source of truth before adding AI mapping behavior. AI should suggest mappings only when the deterministic BQS/template parser cannot recognize a workbook confidently.
