"use client";

import { useActionState } from "react";
import {
  assignStaffRoleAction,
  revokeStaffRoleAction,
  type AdminRoleActionState,
} from "@/server/actions/admin-role-actions";
import { BOOTSTRAP_OWNER_EMAIL } from "@/lib/auth/bootstrap-owner";

const initial: AdminRoleActionState = {};

type StaffRow = {
  userId: string;
  role: string;
  email: string | null;
  fullName: string | null;
  isActive: boolean;
  isBootstrap: boolean;
};

export function AdminUsersRoleManager({
  rows,
  actorIsOwner,
}: {
  rows: StaffRow[];
  actorIsOwner: boolean;
}) {
  const [assignState, assignAction, assignPending] = useActionState(assignStaffRoleAction, initial);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeStaffRoleAction, initial);

  return (
    <div className="space-y-8">
      {actorIsOwner ? (
        <form action={assignAction} className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-h3">Staff-rol toekennen</h2>
          <p className="text-muted text-small">
            Alleen bestaande Auth-gebruikers. OWNER wordt nooit via dit formulier toegekend.
            Bootstrap-owner ({BOOTSTRAP_OWNER_EMAIL}) is beschermd.
          </p>
          <label className="block text-small">
            E-mail
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
              placeholder="collega@vdbdigital.nl"
              autoComplete="off"
            />
          </label>
          <label className="block text-small">
            Rol
            <select
              name="role"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
              defaultValue="ADMIN"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="SUPPORT">SUPPORT</option>
              <option value="CONTENT">CONTENT</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={assignPending}
            className="rounded-lg bg-primary text-white px-4 py-2 text-small font-medium disabled:opacity-50"
          >
            {assignPending ? "Bezig…" : "Rol toekennen"}
          </button>
          {assignState.error ? (
            <p className="text-small text-error" role="alert">
              {assignState.error}
            </p>
          ) : null}
          {assignState.success ? (
            <p className="text-small text-success" role="status">
              Rol toegekend.
            </p>
          ) : null}
        </form>
      ) : (
        <p className="text-muted text-small">Alleen OWNER kan rollen toekennen of intrekken.</p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.userId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4 text-small"
          >
            <div>
              <div>
                {r.fullName || r.email || r.userId.slice(0, 8)} · <strong>{r.role}</strong>
                {r.isBootstrap ? " · bootstrap owner" : ""}
                {r.isActive === false ? " · geblokkeerd" : ""}
              </div>
              {r.email ? <div className="text-muted">{r.email}</div> : null}
            </div>
            {actorIsOwner && r.role !== "OWNER" && !r.isBootstrap ? (
              <form action={revokeAction}>
                <input type="hidden" name="userId" value={r.userId} />
                <button
                  type="submit"
                  disabled={revokePending}
                  className="rounded border border-border px-3 py-1.5 text-small disabled:opacity-50"
                >
                  Intrekken
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {revokeState.error ? (
        <p className="text-small text-error" role="alert">
          {revokeState.error}
        </p>
      ) : null}
      {revokeState.success ? (
        <p className="text-small text-success" role="status">
          Rol ingetrokken.
        </p>
      ) : null}
    </div>
  );
}
