# Cloudflare Zero Trust (PoC assumptions)

- All traffic to the PoC backend is fronted by Cloudflare. The app listens on port `4060` internally; Cloudflare tunnels map an exec-only subdomain (e.g., `exec.hub.example.com`) to this origin.
- Cloudflare Access handles SSO (SAML/OIDC). After a successful check, it injects a signed identity header `x-cf-exec-identity` that the backend middleware validates. For the PoC we mock it with JSON content such as `{ "id": "u1" }`.
- TLS 1.3 enforced at the edge; origin certificates rotated via Cloudflare. Mutual TLS can be enabled for service-to-service calls if the branches become microservices.
- Logs: WAF/access logs are retained centrally. The PoC emits structured `InteractionEvent` JSON for later ingestion by Riai/analytics.
- Device posture: Access policies can require healthy device posture (EDR installed, corporate email, country allowlist) before reaching the lobby.
