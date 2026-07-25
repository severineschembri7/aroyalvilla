import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createStaffAccount, listStaffProfiles } from "@/lib/staff.functions";

export const Route = createFileRoute("/staff/new")({
  head: () => ({ meta: [{ title: "Register Staff — Operations" }] }),
  component: StaffNewPage,
});

function StaffNewPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"front_desk" | "restaurant_bar" | "housekeeping" | "management">("front_desk");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    setLoading(true);
    try {
      await createStaffAccount({ email, password, fullName, role, department });
      setMessage("Staff account created");
      // Refresh staff list
      try {
        await listStaffProfiles();
      } catch (e) {
        // ignore
      }
      setLoading(false);
      navigate({ to: "/system" });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to create staff");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto bg-white border rounded p-6">
        <h2 className="text-xl font-semibold mb-4">Register New Staff</h2>
        <div className="space-y-3">
          <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2 border rounded" />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" />
          <input placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full p-2 border rounded" />
          <input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-2 border rounded" />
          <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full p-2 border rounded">
            <option value="front_desk">Front Desk</option>
            <option value="restaurant_bar">Restaurant & Bar</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="management">Management</option>
          </select>
          <div className="flex gap-2">
            <button onClick={submit} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">Create</button>
            <button onClick={() => navigate({ to: "/system" })} className="px-4 py-2 bg-slate-200 rounded">Cancel</button>
          </div>
          {message && <div className="text-sm text-slate-600">{message}</div>}
        </div>
      </div>
    </div>
  );
}
