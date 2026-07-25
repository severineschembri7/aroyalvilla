import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const updateStaffRoleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["none", "staff", "management", "admin"]),
});

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  user_metadata?: { role?: string };
  app_metadata?: { role?: string };
};

function getRoleFromUser(user: AdminUser) {
  return (
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    ""
  ).toString();
}

export const listStaffUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;

  return (data.users ?? []).map((user: AdminUser) => ({
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    role: getRoleFromUser(user) || "none",
  }));
});

export const updateStaffRole = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateStaffRoleSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const roleValue = data.role === "none" ? "" : data.role;

    const { data: updatedUser, error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      user_metadata: { role: roleValue },
      app_metadata: { role: roleValue },
    });

    if (error) throw error;
    return {
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: roleValue || "none",
      },
    };
  });
