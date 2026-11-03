import type { Metadata } from "next";
import { AlertCircle, Download, Scale } from "lucide-react";
import Link from "next/link";

import { DashboardCard, PageHeader } from "@/components/dashboard";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        description="Review the structured records currently available for reporting and case preparation."
        eyebrow="Reporting"
        title="Reports"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <ReportSource
          description="Review issue priority, status, evidence, and communication history."
          href="/issues"
          icon={AlertCircle}
          title="Issue records"
        />
        <ReportSource
          description="Review dispute references, evidence, timelines, and resolution notes."
          href="/disputes"
          icon={Scale}
          title="Dispute records"
        />
      </div>
      <DashboardCard className="mt-4">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-950">Export records</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Download the currently accessible issue or dispute records as CSV.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
              download
              href="/api/reports/export?type=issues"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export issues
            </a>
            <a
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
              download
              href="/api/reports/export?type=disputes"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export disputes
            </a>
          </div>
        </div>
      </DashboardCard>
    </>
  );
}

function ReportSource({
  description,
  href,
  icon: Icon,
  title,
}: {
  description: string;
  href: string;
  icon: typeof AlertCircle;
  title: string;
}) {
  return (
    <DashboardCard>
      <div className="p-4 sm:p-5">
        <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
        <h2 className="mt-3 font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        <Link href={href}>
          <Button className="mt-4" variant="outline">
            View records
          </Button>
        </Link>
      </div>
    </DashboardCard>
  );
}
