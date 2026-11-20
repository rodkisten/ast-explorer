# Cloudflare deployment

Production: https://ast.migos.club

Preview for PR #123: https://pr123-dev.ast.migos.club

On main push deploy production; on PR update deploy a dedicated ast-pr-N Worker; on PR close or merge remove the Worker and custom domain.

## Secrets

Set CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID in GitHub Actions secrets. The Cloudflare token needs Workers deployment and Custom Domains permissions.

## Validation

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm generate
test -f .output/public/index.html
test -f .output/public/_headers
```

The public/_headers file preserves COOP same-origin and COEP require-corp required for Oxc SharedArrayBuffer. Validate the actual published headers and parser behavior.

This integration remains a draft until a preview build, deploy, and cleanup are confirmed. Never execute untrusted fork PR code with Cloudflare credentials.
