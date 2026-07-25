export type StaffRole = "front_desk" | "restaurant_bar" | "housekeeping" | "management";

export type PermissionAction =
  | "view_reservations"
  | "approve_reservation"
  | "edit_reservation"
  | "cancel_reservation"
  | "delete_reservation"
  | "check_in"
  | "check_out"
  | "take_orders"
  | "update_room_status"
  | "view_billing"
  | "add_billing"
  | "manage_staff"
  | "view_hr";

const rolePermissions: Record<StaffRole, PermissionAction[]> = {
  front_desk: [
    "view_reservations",
    "approve_reservation",
    "edit_reservation",
    "cancel_reservation",
    "check_in",
    "check_out",
    "view_billing",
    "add_billing",
  ],
  restaurant_bar: ["take_orders", "view_billing", "add_billing"],
  housekeeping: ["update_room_status"],
  management: [
    "view_reservations",
    "approve_reservation",
    "edit_reservation",
    "cancel_reservation",
    "delete_reservation",
    "check_in",
    "check_out",
    "take_orders",
    "update_room_status",
    "view_billing",
    "add_billing",
    "manage_staff",
    "view_hr",
  ],
};

export function normalizeRole(role?: string | null): StaffRole | null {
  const value = (role || "").toLowerCase();
  if (value === "management" || value === "admin") return "management";
  if (value === "front_desk" || value === "frontdesk") return "front_desk";
  if (value === "restaurant_bar" || value === "restaurant" || value === "bar") return "restaurant_bar";
  if (value === "housekeeping") return "housekeeping";
  return null;
}

export function hasPermission(role: string | null | undefined, action: PermissionAction) {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  return rolePermissions[normalized].includes(action);
}

export function roleLabel(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "front_desk":
      return "Front Desk";
    case "restaurant_bar":
      return "Restaurant & Bar";
    case "housekeeping":
      return "Housekeeping";
    case "management":
      return "Management";
    default:
      return "Staff";
  }
}

export function navItemsForRole(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  const baseItems = [
    { key: "dashboard", label: "Dashboard", permissions: [] },
    { key: "reservations", label: "Reservations", permissions: ["view_reservations"] },
    { key: "calendar", label: "Calendar", permissions: ["view_reservations"] },
    { key: "guests", label: "Guests", permissions: ["view_reservations"] },
    { key: "reservations/new", label: "New Reservation", permissions: ["edit_reservation"] },
    { key: "restaurant", label: "Restaurant", permissions: ["take_orders"] },
    { key: "bar", label: "Bar", permissions: ["take_orders"] },
    { key: "billing", label: "Billing", permissions: ["view_billing"] },
    { key: "hr", label: "HR", permissions: ["view_hr"] },
    { key: "staff/new", label: "Create Staff", permissions: ["manage_staff"] },
  ];

  return baseItems.filter((item) => {
    if (item.permissions.length === 0) return true;
    return item.permissions.some((action) => hasPermission(normalized ? normalized : role, action));
  });
}
