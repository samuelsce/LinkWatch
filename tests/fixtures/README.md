# Network test fixtures

`tls-test-key.pem` and `tls-test-cert.pem` are a deliberately public, self-signed
test certificate/key pair for an isolated localhost server. They are not
credentials for any environment and must never be used to host the application.
The probe must reject this certificate; tests do not disable TLS verification.

The test-only transport maps a validated synthetic public target to the local
fixture. There is no environment variable or production allowlist for localhost.

`worker-harness.ts` is a separate process entrypoint used by browser E2E. It
requires TEST_DATABASE_URL, injects only its local fixture transport, and runs the
application's worker loop/runtime with a shortened test wait. It is not an app
entrypoint and is never imported by production code.
