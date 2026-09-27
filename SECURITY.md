# Security Policy

## Important Disclaimer

KingStop is a **research and education project**. It is a paper-trading and
trading-intelligence platform — it does not provide financial advice and must
not be connected to a real brokerage or exchange. Do not deploy it to handle
real money, real orders, or cardholder data without significant additional
hardening and compliance work.

## Supported Versions

| Version     | Supported          |
|-------------|--------------------|
| main        | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in KingStop, please report it
responsibly. **Do not open a public GitHub issue for security vulnerabilities.**

### How to report

1. **GitHub Security Advisories** — use the
   [Security Advisories](https://github.com/BerlinDeskMudit/kingswork-trading-intelligence/security/advisories/new)
   feature for private disclosure.
2. **Email** — contact the maintainer through GitHub's private contact feature
   on <https://github.com/BerlinDeskMudit> (click "Security" on the profile page).

### What to include

- A description of the vulnerability and its potential impact.
- Steps to reproduce or a proof of concept.
- Any suggested fix, if you have one.

### What to expect

- **Acknowledgment** within 48 hours of your report.
- **Assessment** within 7 days, with a status update.
- **Resolution timeline** communicated once the issue is confirmed.
- Credit in release notes and acknowledgments (unless you prefer to remain
  anonymous).

### Scope

The following are in scope for security reports:

- Authentication or authorization bypass (JWT handling, route guards, role
  checks).
- Injection or data leakage through the `/api/v1` surface.
- Misconfiguration defaults that expose data or permit privilege escalation.
- Remote code execution or denial-of-service vectors.
- Secret handling: keys or credentials leaking into logs, responses, or the
  repository.

The following are **out of scope**:

- The demo/test credentials in `backend/.env.example` — explicitly documented
  as for local development only.
- The SQLite development database seeded with demo users — local development
  only.
- Deliberate "educational" seams such as simulated market data.

## Security Best Practices for Forks

If you fork KingStop for a shared or pre-production deployment:

1. **Replace `SECRET_KEY` and all demo/test account values** before deployment.
2. **Use a managed database** (or a properly secured Postgres) instead of the
   default SQLite file for a multi-user deployment.
3. **Enable TLS** on all public endpoints.
4. **Keep external integrations off by default** unless you control the keys:
   `USE_REDIS`, `STRIPE_ENABLED`, and `GROQ_API_KEY`.
5. **Do not commit `backend/.env`** — it is excluded by `.gitignore`.
6. **Report rather than post** anything security-related.

## Acknowledgments

We thank security researchers who report vulnerabilities responsibly. Your
efforts help make open trading infrastructure safer for everyone.