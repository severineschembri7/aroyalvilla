import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listStaff, grantRole, revokeRole, inviteStaff } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/staff")({
  ssr: false,
  component: StaffPage,
});

type Member = Awaited<ReturnType<typeof listStaff>>[number];

const ROLES = ["admin", "staff"] as const;

function StaffPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof ROLES)[number]>("staff");

  const load = async () => {
    try {
      setMembers(await listStaff());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load staff.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(msg);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl text-espresso">Staff &amp; roles</h1>
        <p className="text-sm text-espresso/60">
          Invite team members and control who can access the dashboard.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm text-terracotta">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-sage/50 bg-sage/10 px-4 py-3 text-sm text-espresso">
          {notice}
        </div>
      )}

      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-espresso/10 bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email) return;
          void run(
            "invite",
            () => inviteStaff({ data: { email, role: inviteRole } }),
            `Invitation sent to ${email}.`,
          ).then(() => setEmail(""));
        }}
      >
        <label className="min-w-[240px] flex-1 text-sm">
          <span className="text-[10px] uppercase tracking-widest text-espresso/50">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@africanroyalvilla.co.tz"
            className="mt-1 w-full rounded-lg border border-espresso/15 bg-cream px-3 py-2 outline-none focus:border-terracotta"
          />
        </label>
        <label className="text-sm">
          <span className="text-[10px] uppercase tracking-widest text-espresso/50">Role</span>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as (typeof ROLES)[number])}
            className="mt-1 w-full rounded-lg border border-espresso/15 bg-cream px-3 py-2 outline-none focus:border-terracotta"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busy === "invite"}
          className="rounded-lg bg-terracotta px-5 py-2 text-sm font-medium text-cream transition hover:bg-espresso disabled:opacity-50"
        >
          {busy === "invite" ? "Inviting…" : "Invite"}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-espresso/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-[10px] uppercase tracking-widest text-espresso/50">
            <tr>
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-left">Roles</th>
              <th className="px-4 py-3 text-left">Last sign-in</th>
              <th className="px-4 py-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody>
            {members === null && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-espresso/50">
                  Loading…
                </td>
              </tr>
            )}
            {members?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-espresso/50">
                  No accounts yet.
                </td>
              </tr>
            )}
            {members?.map((m) => (
              <tr key={m.id} className="border-t border-espresso/5">
                <td className="px-4 py-3">{m.email || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {m.roles.length === 0 && (
                      <span className="text-xs text-espresso/40">no access</span>
                    )}
                    {m.roles.map((r) => (
                      <span
                        key={r}
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                          r === "admin"
                            ? "bg-espresso text-cream"
                            : "bg-sage/30 text-espresso"
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-espresso/60">
                  {m.lastSignInAt ? new Date(m.lastSignInAt).toLocaleDateString() : "never"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {ROLES.map((r) => {
                      const has = m.roles.includes(r);
                      const key = `${m.id}:${r}`;
                      return (
                        <button
                          key={r}
                          disabled={busy === key}
                          onClick={() =>
                            void run(
                              key,
                              () =>
                                has
                                  ? revokeRole({ data: { userId: m.id, role: r } })
                                  : grantRole({ data: { userId: m.id, role: r } }),
                              has ? `Removed ${r} from ${m.email}.` : `Granted ${r} to ${m.email}.`,
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-40 ${
                            has
                              ? "border-terracotta/40 text-terracotta hover:bg-terracotta/10"
                              : "border-espresso/20 text-espresso/70 hover:bg-espresso/5"
                          }`}
                        >
                          {has ? `Remove ${r}` : `Make ${r}`}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
