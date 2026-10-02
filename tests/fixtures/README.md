# Network test fixtures

`tls-test-key.pem` and `tls-test-cert.pem` are a deliberately public, self-signed
test certificate/key pair for an isolated localhost server. They are not
credentials for any environment and must never be used to host the application.
The probe must reject this certificate; tests do not disable TLS verification.

The test-only transport maps a validated synthetic public target to the local
fixture. There is no environment variable or production allowlist for localhost.
