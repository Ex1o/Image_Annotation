# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Here are the versions that are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within VisionRapid, please send an email to security@visionrapid.com. All security vulnerabilities will be promptly addressed.

**Please do not publicly disclose the issue until it has been addressed by the team.**

### What to Include

When reporting a vulnerability, please include:

1. **Description** - A clear description of the vulnerability
2. **Steps to Reproduce** - Detailed steps to reproduce the issue
3. **Impact** - What an attacker could do with this vulnerability
4. **Affected Versions** - Which versions are affected
5. **Proof of Concept** - If possible, include a proof of concept

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity and complexity

## Security Best Practices

When using VisionRapid:

1. **Never commit secrets** - Use environment variables for sensitive data
2. **Keep dependencies updated** - Run `npm audit` and `pip check` regularly
3. **Use HTTPS** - Always use HTTPS in production
4. **Validate inputs** - Always validate and sanitize user inputs
5. **Limit file uploads** - Set appropriate file size and type restrictions

## Known Security Considerations

- Model files (*.pt) can be large - implement size restrictions in production
- Image uploads should be validated and sanitized
- API endpoints should be properly authenticated and rate-limited

Thank you for helping keep VisionRapid and our users safe!
