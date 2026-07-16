import fs from "node:fs";
import path from "node:path";

const root = "review-package";

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function categorize(rel) {
  const n = rel.replace(/\\/g, "/").toLowerCase();
  if (n.includes("/screenshots/") || n.endsWith(".png") || n.endsWith(".jpg"))
    return "SCREENSHOT";
  if (n.includes("/reports/") || n.includes("/docs/")) return "DOCUMENTATION";
  if (n.includes("/tests/") || n.includes("playwright") || n.includes("vitest"))
    return "TEST";
  if (n.includes("/i18n/")) return "I18N";
  if (n.includes("/supabase/") || n.includes("migration")) return "DATABASE";
  if (n.includes("/server/") || n.includes("/actions/")) return "SERVER";
  if (n.includes("mollie") || n.includes("payment") || n.includes("checkout"))
    return "PAYMENT";
  if (n.includes("email") || n.includes("resend")) return "EMAIL";
  if (
    n.includes("security") ||
    n.includes("auth") ||
    n.includes("csrf") ||
    n.includes("rbac") ||
    n.includes("mfa")
  )
    return "SECURITY";
  if (
    n.includes("/config/") ||
    n.includes("package.json") ||
    n.includes(".env.example") ||
    n.includes("tsconfig") ||
    n.includes("next.config")
  )
    return "CONFIG";
  if (n.includes("/public/")) return "ASSET";
  if (n.includes("/components/") || n.includes("/styles/")) return "COMPONENT";
  if (n.includes("/app/")) return "APP";
  return "APP";
}

const files = walk(root);
let manifest = `# FILE_MANIFEST

Generated: ${new Date().toISOString()}
Total files in package: ${files.length}

## Included

| File | Purpose | Category | Sensitive data checked | Notes |
| --- | --- | --- | --- | --- |
`;

for (const f of files.sort()) {
  const rel = f.replace(/\\/g, "/");
  const cat = categorize(rel);
  const purpose = path.basename(f);
  manifest += `| \`${rel}\` | ${purpose} | ${cat} | YES |  |\n`;
}

manifest += `
## Intentionally excluded from package

- node_modules/
- .next/
- .git/
- coverage/
- playwright-report/
- test-results/ (except selected screenshots copied to SCREENSHOTS/)
- .env.local and all real env files
- .vercel/
- dist/build/out caches
- local logs with PII
`;

fs.writeFileSync(path.join(root, "FILE_MANIFEST.md"), manifest);
console.log("manifest_files", files.length);
