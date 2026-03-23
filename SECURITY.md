# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ue-flow, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainer directly or use [GitHub's private vulnerability reporting](https://github.com/azereki/ue-flow/security/advisories/new).

## Scope

ue-flow is a client-side rendering tool. The primary security concerns are:
- Cross-site scripting (XSS) via crafted T3D input
- Malicious content in AI-generated graphs
- Supply chain attacks on dependencies

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest  | Yes       |
