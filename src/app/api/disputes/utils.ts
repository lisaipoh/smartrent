import { Types } from "mongoose";
import { NextResponse } from "next/server";

import {
  DisputeModel,
  EvidenceModel,
  IssueModel,
  MessageModel,
  PropertyModel,
  TenancyModel,
  UserModel,
  type DisputeDocument,
} from "@/database/models";
import { connectMongoDB } from "@/lib/mongodb";
import type { UserRole } from "@/types/database";
import { tenantBelongsToTenancy } from "@/lib/tenancy-access";

export type ApiSessionUser = {
  email: string;
  id: string;
  role: UserRole;
};

export function unauthenticatedResponse() {
  return NextResponse.json(
    { error: "Authentication is required." },
    { status: 401 },
  );
}

export function forbiddenResponse(
  message = "You are not authorized to access this resource.",
) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFoundResponse() {
  return NextResponse.json({ error: "Dispute not found." }, { status: 404 });
}

export function validationErrorResponse(
  fieldErrors: Record<string, string[] | undefined>,
) {
  return NextResponse.json(
    { error: "Validation failed.", fieldErrors },
    { status: 400 },
  );
}

export async function generateDisputeReference() {
  const year = new Date().getFullYear();
  const count = await DisputeModel.countDocuments({
    disputeReference: new RegExp(`^DIS-${year}-`),
  });

  return `DIS-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function canAccessDispute(
  dispute: DisputeDocument,
  user: ApiSessionUser,
) {
  if (user.role === "admin") return true;
  if (user.role === "tenant") {
    if (dispute.tenantId === user.id || dispute.raisedBy === user.id)
      return true;
    if (!dispute.tenancyId) return false;
    const tenancy = await TenancyModel.findById(dispute.tenancyId);
    return tenancy ? tenantBelongsToTenancy(tenancy, user) : false;
  }
  return dispute.landlordId === user.id;
}

export async function findAccessibleDispute(id: string, user: ApiSessionUser) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectMongoDB();
  const dispute = await DisputeModel.findOne({ _id: id });
  if (!dispute || !(await canAccessDispute(dispute, user))) return null;
  return dispute;
}

export async function serializeDispute(dispute: DisputeDocument) {
  const [issue, property, tenancy, tenant, raisedBy] = await Promise.all([
    IssueModel.findOne({ _id: dispute.issueId }),
    PropertyModel.findOne({ _id: dispute.propertyId }),
    dispute.tenancyId ? TenancyModel.findOne({ _id: dispute.tenancyId }) : null,
    UserModel.findOne({ _id: dispute.tenantId }),
    UserModel.findOne({ _id: dispute.raisedBy }).select("name"),
  ]);

  return {
    id: dispute._id.toString(),
    disputeReference: dispute.disputeReference,
    issueId: dispute.issueId,
    propertyId: dispute.propertyId,
    tenancyId: dispute.tenancyId ?? null,
    landlordId: dispute.landlordId,
    tenantId: dispute.tenantId,
    raisedBy: dispute.raisedBy,
    title: dispute.title,
    reason: dispute.reason,
    description: dispute.description,
    status: dispute.status,
    priority: dispute.priority,
    resolutionNotes: dispute.resolutionNotes ?? "",
    issueTitle: issue?.title ?? "Issue unavailable",
    propertyName: property?.propertyName ?? "Property unavailable",
    tenantName: tenancy?.tenantName ?? tenant?.name ?? "Tenant",
    primaryTenantName: tenancy?.tenantName ?? tenant?.name ?? "Tenant",
    raisedByName: raisedBy?.name ?? tenant?.name ?? "SmartRent user",
    createdAt: dispute.createdAt.toISOString(),
    updatedAt: dispute.updatedAt.toISOString(),
  };
}

export async function getDisputeTimeline(dispute: DisputeDocument) {
  const [issue, evidence, messages] = await Promise.all([
    IssueModel.findOne({ _id: dispute.issueId }),
    EvidenceModel.find({
      $or: [
        { issueId: dispute.issueId },
        { disputeId: dispute._id.toString() },
      ],
    }),
    MessageModel.find({ issueId: dispute.issueId }),
  ]);
  const actorIds = [
    dispute.raisedBy,
    ...(dispute.activityHistory ?? []).map((entry) => entry.changedBy),
  ];
  const actors = await UserModel.find({ _id: { $in: actorIds } }).select(
    "name",
  );
  const actorNames = new Map(
    actors.map((actor) => [actor._id.toString(), actor.name]),
  );
  const events = [
    ...(issue
      ? [
          {
            id: `issue-${issue._id}`,
            at: issue.createdAt.toISOString(),
            label: "Issue reported",
            detail: issue.title,
          },
        ]
      : []),
    {
      id: `dispute-${dispute._id}`,
      at: dispute.createdAt.toISOString(),
      label: "Dispute raised",
      detail: `Raised by ${actorNames.get(dispute.raisedBy) ?? "SmartRent user"}`,
    },
    ...evidence.map((item) => ({
      id: `evidence-${item._id}`,
      at: item.createdAt.toISOString(),
      label: "Evidence uploaded",
      detail: item.fileName,
    })),
    ...messages.map((message) => ({
      id: `message-${message._id}`,
      at: message.createdAt.toISOString(),
      label: "Issue-linked message sent",
      detail: message.subject,
    })),
    ...(dispute.activityHistory ?? []).map((entry, index) => ({
      id: `dispute-activity-${dispute._id}-${index}`,
      at: entry.changedAt.toISOString(),
      label:
        entry.type === "status_changed"
          ? "Status changed"
          : "Resolution notes updated",
      detail:
        entry.type === "status_changed"
          ? `Changed to ${entry.status?.replaceAll("_", " ") ?? "unknown"} by ${actorNames.get(entry.changedBy) ?? "SmartRent user"}`
          : `Updated by ${actorNames.get(entry.changedBy) ?? "SmartRent user"}`,
    })),
  ];

  return events.sort((left, right) => left.at.localeCompare(right.at));
}
