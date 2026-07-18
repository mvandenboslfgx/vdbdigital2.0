"use client";

import { useTransition } from "react";
import { markNotificationsReadAction } from "@/server/actions/portal-actions";
import { Button } from "@/components/ui/button";

export function MarkNotificationsReadButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await markNotificationsReadAction();
        });
      }}
    >
      Alles als gelezen
    </Button>
  );
}
