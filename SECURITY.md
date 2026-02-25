# Security

## Reporting a vulnerability

If you believe you've found a security vulnerability in this project, please report it responsibly.

- **Do not** open a public GitHub issue for security-sensitive bugs.
- Contact the maintainers privately (e.g. via the repository owner's contact method or a dedicated security contact if listed below).
- Include a clear description, steps to reproduce, and impact if possible.
- Allow time for a fix before any public disclosure.

We will acknowledge receipt and work with you to understand and address the issue.

## Supported versions

We apply security fixes to the current main branch. If you depend on an older release, please upgrade to get patches.

## Scope

- This app runs as a store-local price checker; it does not authenticate end users.
- The optional `SYNC_API_KEY` protects the sync endpoint; use a strong value and keep it secret.
- Database and env files (`.env`, `data/*.db`) must not be committed.
