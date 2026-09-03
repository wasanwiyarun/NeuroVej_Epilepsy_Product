# Repository Instructions

## Scope

This repository contains delivered product source and product test source.
Controlled lifecycle documents belong in `NeuroVej_Epilepsy_DOC`; development
tools that are not delivered belong in `NeuroVej_Epilepsy_NPS_Tools`.

## Change control

- Every branch, commit, and pull request uses the approved non-clickable
  `DOC#<number>` identifier. The maintainer links the public PR from the private
  controlled issue.
- Do not implement product functionality before its requirements and design are
  reviewed at the applicable lifecycle gate.
- Link code and tests to stable requirement/design/test IDs.
- Include safety, security, privacy, SOUP/SBOM, and regression impact in PRs.
- Dependency and toolchain changes require documented impact evaluation.
- Safety- and security-critical changes require independent review.
- Do not weaken tests, static checks, security controls, or warnings merely to
  make CI pass.

## Data and secrets

- Do not commit secrets, signing keys, credentials, tokens, or production
  configuration.
- Do not commit identifiable health data or unapproved clinical datasets.
- Use synthetic fixtures until dataset governance is approved.
