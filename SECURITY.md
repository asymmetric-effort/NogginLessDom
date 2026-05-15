# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

As the project matures, this table will be updated to reflect which release
lines receive security patches.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Use GitHub's **private vulnerability reporting** feature on the
   [NogginLessDom repository](https://github.com/asymmetric-effort/NogginLessDom/security/advisories/new),
   or
2. Email the maintainers at the address listed in the repository's contact
   information.

### What to Include

- A clear description of the vulnerability and its potential impact.
- Detailed steps to reproduce the issue (proof of concept if possible).
- The affected version(s) and environment (OS, Node.js version, Bun version).
- Any suggested mitigation or fix (optional but appreciated).

### Disclosure Process

1. **Acknowledgment** -- We will acknowledge receipt of your report within
   **48 hours**.
2. **Triage** -- An initial assessment and severity rating will be provided
   within **5 business days**.
3. **Fix Development** -- A patch will be developed privately. Critical
   vulnerabilities are targeted for resolution within **30 days**; lower
   severity issues within **90 days**.
4. **Coordinated Disclosure** -- Once a fix is released, we will publish a
   security advisory crediting the reporter (unless anonymity is requested).
5. **CVE Assignment** -- For qualifying vulnerabilities, we will request a
   CVE identifier.

### Scope

The following areas are in scope for security reports:

- **Supply chain integrity** -- NogginLessDom has zero third-party runtime
  dependencies by design. Any issue that could compromise this guarantee is
  critical.
- **DOM parsing safety** -- Prevention of XSS, injection, or prototype
  pollution through the DOM simulation layer.
- **Test isolation** -- Ensuring test environments cannot leak state,
  credentials, or filesystem access beyond their sandbox.
- **Build pipeline** -- Vulnerabilities in CI/CD workflows, Makefile targets,
  or release processes.

### Out of Scope

- Vulnerabilities in dev dependencies (report those to the upstream project).
- Issues requiring physical access to the machine running tests.
- Social engineering attacks.

## Security Design Principles

NogginLessDom is built with security as a first-class concern:

1. **Zero runtime dependencies** -- Eliminates the supply chain attack surface
   entirely.
2. **Node.js built-ins only** -- Relies exclusively on `node:test`,
   `node:assert`, and standard APIs.
3. **No eval or dynamic code execution** -- DOM parsing never uses `eval()`,
   `Function()`, or similar constructs.
4. **Strict input validation** -- All HTML/DOM inputs are validated and
   sanitized.
5. **Regular CodeQL analysis** -- Automated static analysis runs on every push
   and on a weekly schedule.
6. **Dependabot monitoring** -- Dev dependencies are monitored for known
   vulnerabilities with weekly checks.
7. **Minimal permissions** -- CI workflows use least-privilege principles.
