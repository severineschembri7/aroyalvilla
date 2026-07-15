import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { housekeeping, type HousekeepingTask } from "@/lib/mock-ops";
import { findRoom } from "@/lib/rooms";

export const Route = createFileRoute("/dashboard/housekeeping")({
  component: HousekeepingView,
});

function HousekeepingView() {
  const [state, setState] = useState(housekeeping);

  const groups: Record<HousekeepingTask["status"], HousekeepingTask[]> = {
    pending: [],
    "in-progress": [],
    done: [],
  };
  state.forEach((t) => groups[t.status].push(t));

  const advance = (id: string) =>
    setState((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status:
                t.status === "pending"
                  ? "in-progress"
                  : t.status === "in-progress"
                    ? "done"
                    : "done",
            }
          : t,
      ),
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl">Housekeeping</h2>
        <p className="text-xs text-espresso/50">
          Tablet view · tap a task to advance status ({state.filter((t) => t.status !== "done").length}{" "}
          open)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["pending", "in-progress", "done"] as const).map((col) => (
          <div key={col} className="bg-white border border-espresso/10">
            <div className="px-4 py-3 border-b border-espresso/10 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-espresso/50 font-semibold">
                {col.replace("-", " ")}
              </span>
              <span className="text-xs text-espresso/50">{groups[col].length}</span>
            </div>
            <ul className="p-3 space-y-2 min-h-[300px]">
              {groups[col].map((t) => (
                <li
                  key={t.id}
                  onClick={() => advance(t.id)}
                  className={`p-3 border cursor-pointer select-none active:scale-[0.98] transition ${
                    t.priority === "high"
                      ? "border-terracotta/40 bg-terracotta/5"
                      : "border-espresso/10 bg-cream/40"
                  }`}
                >
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-sm">
                      {findRoom(t.roomId)?.name} #{t.unit}
                    </span>
                    <span className="text-[10px] text-espresso/50">{t.dueBy}</span>
                  </div>
                  <div className="text-xs text-espresso/60 capitalize mt-1">
                    {t.type.replace("-", " ")} · {t.assignee}
                  </div>
                </li>
              ))}
              {groups[col].length === 0 && (
                <li className="text-xs text-espresso/40 text-center py-6">Nothing here.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}