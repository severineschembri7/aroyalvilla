import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — Operations" }] }),
  component: BillingPage,
});

type Item = {
  id?: string;
  booking_reference?: string;
  description?: string;
  amount?: number;
  kind?: string;
  created_at?: string;
};

function BillingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate({ to: "/login" });
        return;
      }

      const { data, error } = await supabase.from("billing_items").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setItems((data ?? []) as Item[]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const submitPayment = async () => {
    setMessage(null);
    if (!reference || amount <= 0) {
      setMessage("Provide booking reference and positive amount");
      return;
    }

    const { error } = await supabase.from("billing_items").insert({
      booking_reference: reference,
      description: "Payment received",
      amount: -Math.abs(amount),
      kind: "payment",
      created_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    // refresh
    const { data } = await supabase.from("billing_items").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Item[]);
    setMessage("Payment recorded");
    setReference("");
    setAmount(0);
  };

  if (loading) return <div className="p-6">Loading billing…</div>;

  // Compute totals by booking
  const totals: Record<string, number> = {};
  for (const it of items) {
    const k = it.booking_reference ?? "unassigned";
    totals[k] = (totals[k] || 0) + (it.amount ?? 0);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h2 className="text-xl font-semibold mb-4">Billing</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded border p-4">
          <h3 className="font-medium mb-2">Record Payment</h3>
          <input placeholder="Booking reference" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full p-2 border rounded mb-2" />
          <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full p-2 border rounded mb-2" />
          <button onClick={submitPayment} className="px-3 py-2 bg-green-600 text-white rounded">Record Payment</button>
          {message && <div className="mt-2 text-sm text-slate-600">{message}</div>}
        </div>

        <div className="md:col-span-2 bg-white rounded border p-4">
          <h3 className="font-medium mb-2">Recent Billing Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-2">Booking</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">When</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id ?? idx} className="border-b">
                    <td className="p-2">{it.booking_reference ?? "—"}</td>
                    <td className="p-2">{it.description}</td>
                    <td className="p-2 text-right">{(it.amount ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-xs text-slate-500">{it.created_at ? new Date(it.created_at).toLocaleString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <h4 className="font-medium mb-2">Outstanding Balances</h4>
            <ul>
              {Object.keys(totals).map((k) => (
                <li key={k} className="text-sm">{k}: {totals[k].toFixed(2)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
