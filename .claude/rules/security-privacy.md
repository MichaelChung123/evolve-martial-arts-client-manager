# Privacy and Security

The application may store personal information about adults and minors. Treat privacy and security as core requirements.

## Never

- Commit secrets or real credentials
- Use real student information in fixtures, screenshots, or examples
- Log sensitive personal data unnecessarily
- Trust client-side authorization or validation
- Store plaintext passwords
- Expose internal database identifiers when a safer public identifier is appropriate
- Add payment-card storage directly to the application

## Prefer

- Synthetic development data
- Environment variables
- Least-privilege access
- Server-side authorization
- Secure password hashing through established authentication tooling
- Auditability for important changes
- Archival rather than destructive deletion
- Minimal collection of personal data

## Authentication and cryptography

Do not build authentication or cryptography from scratch. Recommend established solutions and explain the tradeoffs before introducing one.
