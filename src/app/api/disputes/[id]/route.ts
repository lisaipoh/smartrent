import { auth } from "@/auth";
import { updateDisputeSchema } from "@/features/disputes/schemas";
import { createDisputeNotification } from "@/lib/notifications";

import {
  findAccessibleDispute,
  forbiddenResponse,
  getDisputeTimeline,
  notFoundResponse,
  serializeDispute,
  unauthenticatedResponse,
  validationErrorResponse,
} from "../utils";

type DisputeRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: DisputeRouteContext) {
  const session = await auth();
  if (!session?.user) return unauthenticatedResponse();

  const { id } = await context.params;
  const dispute = await findAccessibleDispute(id, session.user);
  if (!dispute) return notFoundResponse();

  return Response.json({
    dispute: {
      ...(await serializeDispute(dispute)),
      activity: await getDisputeTimeline(dispute),
    },
  });
}

export async function PUT(request: Request, context: DisputeRouteContext) {
  const session = await auth();
  if (!session?.user) return unauthenticatedResponse();
  if (session.user.role === "tenant") {
    return forbiddenResponse("Tenants cannot update dispute status.");
  }

  const { id } = await context.params;
  const dispute = await findAccessibleDispute(id, session.user);
  if (!dispute) return notFoundResponse();

  const body = await request.json().catch(() => null);
  const parsedBody = updateDisputeSchema.safeParse(body);
  if (!parsedBody.success) {
    return validationErrorResponse(parsedBody.error.flatten().fieldErrors);
  }

  const changedAt = new Date();
  const statusChanged = dispute.status !== parsedBody.data.status;
  const notesChanged =
    (dispute.resolutionNotes ?? "") !== parsedBody.data.resolutionNotes;
  dispute.activityHistory ??= [];

  if (statusChanged) {
    dispute.activityHistory.push({
      type: "status_changed",
      status: parsedBody.data.status,
      changedAt,
      changedBy: session.user.id,
    });
  }
  if (notesChanged) {
    dispute.activityHistory.push({
      type: "resolution_notes_updated",
      changedAt,
      changedBy: session.user.id,
    });
  }

  dispute.status = parsedBody.data.status;
  dispute.resolutionNotes = parsedBody.data.resolutionNotes;
  await dispute.save();

  if (statusChanged) {
    await createDisputeNotification({
      userId: dispute.tenantId,
      disputeId: dispute._id.toString(),
      title: "Dispute status updated",
      message: `${dispute.disputeReference} is now ${dispute.status.replaceAll("_", " ")}.`,
      type: "dispute_status_updated",
    });
  }

  return Response.json({
    dispute: {
      ...(await serializeDispute(dispute)),
      activity: await getDisputeTimeline(dispute),
    },
  });
}

export async function DELETE(_request: Request, context: DisputeRouteContext) {
  const session = await auth();
  if (!session?.user) return unauthenticatedResponse();
  if (session.user.role !== "admin") {
    return forbiddenResponse("Only admins can delete disputes.");
  }

  const { id } = await context.params;
  const dispute = await findAccessibleDispute(id, session.user);
  if (!dispute) return notFoundResponse();

  await dispute.deleteOne();
  return Response.json({ success: true });
}
