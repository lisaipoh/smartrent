"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  Building2,
  MapPin,
  Pencil,
  Scale,
  User,
} from "lucide-react";
import Link from "next/link";

import { EmptyState, PageHeader, StatCard } from "@/components/dashboard";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";
import type { DisputeRecord } from "@/features/disputes/types";
import type { IssueRecord } from "@/features/issues/types";
import type { PropertyRecord } from "@/features/properties/types";
import type { TenancyRecord } from "@/features/tenancies/types";

import { DeletePropertyButton } from "./delete-property-button";
import { InventoryManager } from "./inventory-manager";
import { PropertyStatusBadge } from "./property-status-badge";
import { PropertyTypeBadge } from "./property-type-badge";

type PropertyDetailsProps = {
  id: string;
};

export function PropertyDetails({ id }: PropertyDetailsProps) {
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [tenancies, setTenancies] = useState<
    Array<
      Pick<
        TenancyRecord,
        "id" | "tenantName" | "status" | "startDate" | "endDate"
      >
    >
  >([]);
  const [issues, setIssues] = useState<
    Array<
      Pick<IssueRecord, "id" | "title" | "priority" | "status" | "createdAt">
    >
  >([]);
  const [disputes, setDisputes] = useState<
    Array<
      Pick<
        DisputeRecord,
        "id" | "title" | "disputeReference" | "status" | "createdAt"
      >
    >
  >([]);

  useEffect(() => {
    let mounted = true;

    async function loadProperty() {
      setIsLoading(true);
      setError(null);

      const [response, issuesResponse, disputesResponse, tenanciesResponse] =
        await Promise.all([
          fetch(`/api/properties/${id}`, { cache: "no-store" }),
          fetch(`/api/issues?propertyId=${encodeURIComponent(id)}`, {
            cache: "no-store",
          }),
          fetch(`/api/disputes?propertyId=${encodeURIComponent(id)}`, {
            cache: "no-store",
          }),
          fetch(`/api/tenancies?propertyId=${encodeURIComponent(id)}`, {
            cache: "no-store",
          }),
        ]);
      const [result, issuesResult, disputesResult, tenanciesResult] =
        await Promise.all([
          response.json().catch(() => null),
          issuesResponse.json().catch(() => null),
          disputesResponse.json().catch(() => null),
          tenanciesResponse.json().catch(() => null),
        ]);

      if (!mounted) {
        return;
      }

      if (!response.ok) {
        setError(result?.error ?? "Unable to load property.");
        setIsLoading(false);
        return;
      }

      setProperty(result.property);
      setIsLoading(false);
      setIssues(issuesResponse.ok ? (issuesResult?.issues ?? []) : []);
      setDisputes(disputesResponse.ok ? (disputesResult?.disputes ?? []) : []);
      setTenancies(
        tenanciesResponse.ok ? (tenanciesResult?.tenancies ?? []) : [],
      );
      if (!issuesResponse.ok || !disputesResponse.ok || !tenanciesResponse.ok) {
        setRelatedError("Some related records could not be loaded.");
      }
      setRelatedLoading(false);
    }

    void loadProperty();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Loading property...
        </p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <EmptyState
        action={
          <Link href="/properties">
            <Button variant="outline">Back to properties</Button>
          </Link>
        }
        description={error ?? "The requested property could not be found."}
        icon={Building2}
        title="Property unavailable"
      />
    );
  }

  return (
    <>
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/properties/${property.id}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            </Link>
            <DeletePropertyButton
              id={property.id}
              label="Delete property"
              redirectTo="/properties"
            />
          </div>
        }
        description="Review property information, inventory, and related management records."
        eyebrow="Property details"
        title={property.propertyName}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Property type"
          value={property.propertyType}
        />
        <StatCard
          icon={Building2}
          label="Bedrooms"
          value={property.bedroomCount.toString()}
        />
        <StatCard
          href="#related-tenancies"
          icon={User}
          label="Tenancies"
          linkLabel="View records"
          value="Manage"
        />
        <StatCard
          href="#related-issues"
          icon={AlertCircle}
          label="Issues"
          linkLabel="View records"
          value="Review"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-950">
              Property information
            </h2>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <InfoRow label="Name" value={property.propertyName} />
            <InfoRow label="Address" value={formatAddress(property)} />
            <InfoRow
              label="Type"
              value={<PropertyTypeBadge propertyType={property.propertyType} />}
            />
            <InfoRow
              label="Status"
              value={<PropertyStatusBadge status={property.status} />}
            />
            <InfoRow label="Created" value={formatDate(property.createdAt)} />
            <div className="flex gap-2 rounded-xl border bg-slate-50 p-4 text-slate-600">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
                aria-hidden="true"
              />
              {property.description ||
                "No property description has been added yet."}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-950">
              Related tenancies
            </h2>
          </CardHeader>
          <CardContent id="related-tenancies" className="grid gap-3">
            {relatedLoading ? (
              <p className="text-sm text-slate-600">Loading tenancies...</p>
            ) : tenancies.length ? (
              tenancies.map((tenancy) => (
                <RelatedRecordLink
                  detail={`${tenancy.status} tenancy · started ${formatDate(tenancy.startDate)}`}
                  href={`/tenancies/${tenancy.id}`}
                  key={tenancy.id}
                  title={tenancy.tenantName}
                />
              ))
            ) : (
              <p className="text-sm text-slate-600">
                No tenancy records are linked to this property.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <InventoryManager propertyId={property.id} />
      <section id="related-issues" className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-950">
          Related issues
        </h2>
        {relatedLoading ? (
          <p className="rounded-xl border bg-white p-4 text-sm text-slate-600">
            Loading issues...
          </p>
        ) : issues.length ? (
          <div className="grid gap-3">
            {issues.map((issue) => (
              <RelatedRecordLink
                detail={`${issue.priority} priority · ${issue.status} · reported ${formatDate(issue.createdAt)}`}
                href={`/issues/${issue.id}`}
                key={issue.id}
                title={issue.title}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            action={
              <Link href="/issues">
                <Button variant="outline">View all issues</Button>
              </Link>
            }
            description="No issue records are linked to this property."
            icon={AlertCircle}
            title="No related issues"
          />
        )}
      </section>
      <section id="related-disputes" className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-950">
          <Scale className="h-5 w-5 text-blue-600" aria-hidden="true" />
          Related disputes
        </h2>
        {relatedError ? (
          <p className="mb-3 text-sm text-rose-700">{relatedError}</p>
        ) : null}
        {relatedLoading ? (
          <p className="rounded-xl border bg-white p-4 text-sm text-slate-600">
            Loading disputes...
          </p>
        ) : disputes.length ? (
          <div className="grid gap-3">
            {disputes.map((dispute) => (
              <RelatedRecordLink
                detail={`${dispute.disputeReference} · ${dispute.status} · raised ${formatDate(dispute.createdAt)}`}
                href={`/disputes/${dispute.id}`}
                key={dispute.id}
                title={dispute.title}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            action={
              <Link href="/disputes">
                <Button variant="outline">View all disputes</Button>
              </Link>
            }
            description="No dispute records are linked to this property."
            icon={Scale}
            title="No related disputes"
          />
        )}
      </section>
    </>
  );
}

function RelatedRecordLink({
  detail,
  href,
  title,
}: {
  detail: string;
  href: string;
  title: string;
}) {
  return (
    <Link
      className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
      href={href}
    >
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm capitalize text-slate-600">{detail}</p>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border bg-white p-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function formatAddress(property: PropertyRecord) {
  return `${property.address}, ${property.city}, ${property.postcode}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
