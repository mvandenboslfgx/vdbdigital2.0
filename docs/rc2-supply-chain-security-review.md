# RC2 supply-chain security review — dependency remediation

**Scope:** `package.json`, `package-lock.json` changes on `fix/rc2-production-dependency-remediation`

## Changes reviewed

| Change | Security rationale |
| --- | --- |
| `next@16.2.12` | Patches multiple GHSA advisories for versions `<16.2.11`; semver-compatible patch within 16.2.x |
| `overrides.next.postcss@8.5.23` | Next still declares `postcss@8.4.31`; override forces patched nested version without adding a root direct dep |
| `overrides.next.sharp@0.35.3` | Next optional dep `^0.34.5` resolves below advisory floor; override pins safe 0.35.x |

## Explicit non-changes

- No `npm audit fix` / `--force`
- No major version bumps (Next 16.3 preview/canary forbidden)
- No new git/file dependencies
- No lifecycle script packages added beyond existing sharp platform optional deps
- No migrations, contracts, RPC manifests, or Storage bucket changes
- No RC3 messaging migrations

## Override safety

- Overrides are **scoped to `next` subtree only** — dev PostCSS via Tailwind/Vite unchanged
- Target versions satisfy parent semver expectations (`postcss` 8.x, `sharp` 0.35.x)
- `npm ls` shows single production path: `next → postcss@8.5.23 overridden`, `next → sharp@0.35.3 overridden`

## Supply-chain origin check

All changed packages resolve from `registry.npmjs.org` with integrity hashes present in lockfile.

## Residual risk

Dev-only eslint/minimatch highs (9) remain. Acceptable for RC2 dependency gate: **production high=0**.

## Verdict

Targeted remediation is **least-privilege aligned**: smallest patch set that clears production audit highs while preserving RC2 database/contract boundary.
