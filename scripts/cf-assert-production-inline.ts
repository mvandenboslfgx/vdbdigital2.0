import { readFileSync, existsSync } from "node:fs";

const handler = ".open-next/server-functions/default/handler.mjs";
if (!existsSync(handler)) {
  console.error("NO HANDLER");
  process.exit(1);
}
const h = readFileSync(handler, "utf8");
const marker = "config:{env:{NEXT_PUBLIC_APP_URL:";
const i = h.indexOf(marker);
console.log("config env snippet", JSON.stringify(h.slice(i, i + 90)));
const bad = h.includes(
  'config:{env:{NEXT_PUBLIC_APP_URL:"http://localhost:3000"}',
);
const good = h.includes(
  'config:{env:{NEXT_PUBLIC_APP_URL:"https://vdbdigital.nl"}',
);
const hasWwwAppUrl = h.includes(
  'config:{env:{NEXT_PUBLIC_APP_URL:"https://www.vdbdigital.nl"}',
);
const hasVercelHost =
  h.includes(".vercel.app") && h.includes("NEXT_PUBLIC_APP_URL");
console.log({
  bad,
  good,
  hasWwwAppUrl,
  anyLocalhost: h.includes("localhost:3000"),
  hasVercelHost,
});
if (bad || !good || hasWwwAppUrl) {
  console.error("FAIL: Next config APP_URL inline is not production apex");
  process.exit(1);
}
console.log("PASS: production APP_URL inlined in Next config");
