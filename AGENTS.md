# LinkWatch working agreement

- Explain meaningful implementation steps and their purpose in Portuguese; the owner is learning from this project.
- Keep the product interface in Portuguese and README in English.
- Commit each coherent change separately. Do not squash unrelated changes or combine an entire delivery into one commit.
- The owner has authorized updates to the LinkWatch GitHub repository. Preserve separate commits when pushing; never force-push unless explicitly requested.
- Follow the product rules in docs/PRODUCT.md. Keep implemented behavior distinct from planned behavior in documentation and UI.
- Use a dedicated TEST_DATABASE_URL for integration tests; never substitute the application's database URL.
- Keep credentials, generated clients, test databases, build output and dependency directories out of Git.
- Apply meaningful validation before committing: lint, typecheck, unit tests, database integration tests for data changes, production build and process smoke when appropriate.
- Schema changes include versioned migrations. Do not edit migrations that have already been applied or published.

- Consult the matching Next.js documentation bundled in node_modules/next/dist/docs before changing framework-specific behavior.
