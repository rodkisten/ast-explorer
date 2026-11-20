# Cloudflare deployment

Production: https://ast.migos.club

PR preview #123: https://pr123-dev.ast.migos.club

GitHub Actions builds on main and PR updates; on PR close (including merge), cleanup removes the custom domain and preview Worker. Preview worker names are deterministic: ast-pr-N.

Required repository secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID. Token permissions: Workers Scripts Edit and Workers Routes/Custom Domains Edit for migos.club.

This is an initial integration: verify the cf CLI correctly discovers the Nuxt static build (.output/public) and deploys the assets before merging. The AST Explorer requires COOP same-origin and COEP require-corp headers for Oxc; verify those response headers in both environments. No production deployment has been performed.

Run: pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm generate
