/**
 * Verstuur een Resend-testmail.
 * Gebruik: npm run email:test
 *
 * Vereist in .env.local:
 *   RESEND_API_KEY=re_xxxxxxxxx  (vervang door je echte key)
 *   EMAIL_FROM=onboarding@resend.dev  (test) of je geverifieerde afzender
 *   EMAIL_ADMIN=verzamelvdbdigital@gmail.com  (optioneel, ontvanger)
 */
import { Resend } from "resend";
import { loadEnvLocal } from "./lib/env-loader";

loadEnvLocal();

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to =
    process.env.RESEND_TEST_TO ??
    process.env.EMAIL_ADMIN ??
    "verzamelvdbdigital@gmail.com";

  if (!apiKey) {
    console.error("FAIL: RESEND_API_KEY ontbreekt in .env.local");
    console.error("Vervang re_xxxxxxxxx door je echte Resend API key.");
    process.exit(1);
  }

  if (!from) {
    console.error("FAIL: EMAIL_FROM ontbreekt in .env.local");
    console.error("Voor testen: EMAIL_FROM=onboarding@resend.dev");
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Hello World — VDB Digital",
    html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
  });

  if (error) {
    console.error(`FAIL: ${error.message}`);
    process.exit(1);
  }

  console.log(`PASS testmail verstuurd naar ${to}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
