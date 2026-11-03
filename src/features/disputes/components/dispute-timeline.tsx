import type { DisputeRecord } from "@/features/disputes/types";

export function DisputeTimeline({ dispute }: { dispute: DisputeRecord }) {
  return (
    <div className="grid gap-3">
      <p className="text-xs leading-5 text-slate-500">
        Status and resolution-note history is available from the date activity
        tracking was enabled. Earlier changes were not recorded.
      </p>
      {dispute.activity?.length ? (
        dispute.activity.map((item) => (
          <div className="rounded-xl border bg-slate-50 p-3" key={item.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">
                {item.label}
              </p>
              <time className="text-xs text-slate-500" dateTime={item.at}>
                {formatDate(item.at)}
              </time>
            </div>
            <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
          </div>
        ))
      ) : (
        <p className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
          No recorded activity is available for this dispute.
        </p>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
