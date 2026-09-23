import { googleLoginAction } from "@/server/actions/google-auth-action";

export function GoogleLoginForm({ next }: { next?: string }) {
  if (process.env.GOOGLE_AUTH_ENABLED !== "1") return null;

  return (
    <form action={googleLoginAction}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button
        type="submit"
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-surface-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]"
        >
          G
        </span>
        Doorgaan met Google
      </button>
    </form>
  );
}
