# Security Policy

## Supported versions

Security fixes are applied to the latest code on the default branch. The Chrome extension is currently an MVP intended for developer-mode installation and has not yet been published to the Chrome Web Store.

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities. Use GitHub's private vulnerability reporting for this repository when available, or contact the repository owner privately.

Include the affected route or component, reproduction steps, expected impact, and any suggested mitigation. Do not include real passwords, website cookies, extension tokens, pairing secrets, or private review notes in the report.

## Credential model

The website session and browser-extension connection are separate credentials. Extension tokens are scoped to extension APIs, stored as SHA-256 hashes by the server, expire after 30 days, and can be revoked from the website.
