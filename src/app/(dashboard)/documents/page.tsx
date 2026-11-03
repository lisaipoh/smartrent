import type { Metadata } from "next";
import { FileArchive, FileText, Scale } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { EmptyState, PageHeader } from "@/components/dashboard";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function DocumentsPage() {
  const session = await auth();
  const isTenant = session?.user?.role === "tenant";

  return (
    <>
      <PageHeader
        description={
          isTenant
            ? "Open evidence attached to your issue and dispute records."
            : "Open evidence attached to property issues and dispute records."
        }
        eyebrow={isTenant ? "Tenant workspace" : "Property records"}
        title="Documents"
      />
      <EmptyState
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/issues">
              <Button type="button">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Browse issues
              </Button>
            </Link>
            <Link href="/disputes">
              <Button type="button" variant="outline">
                <Scale className="h-4 w-4" aria-hidden="true" />
                Browse disputes
              </Button>
            </Link>
          </div>
        }
        description="Open a related issue or dispute to view its uploaded evidence. A combined document library is not available yet."
        icon={FileArchive}
        title="Evidence is available from its record"
      />
    </>
  );
}
