import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { DisputeModel, IssueModel } from "@/database/models";
import { connectMongoDB } from "@/lib/mongodb";
import { serializeCsv } from "@/features/reports/services/csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  if (session.user.role === "tenant") {
    return NextResponse.json(
      { error: "Report exports are available to landlords and admins." },
      { status: 403 },
    );
  }

  const type = new URL(request.url).searchParams.get("type");
  if (type !== "issues" && type !== "disputes") {
    return NextResponse.json(
      { error: "Choose an issues or disputes export." },
      { status: 400 },
    );
  }

  await connectMongoDB();
  const query =
    session.user.role === "admin" ? {} : { landlordId: session.user.id };
  const date = new Date().toISOString().slice(0, 10);
  const rows =
    type === "issues" ? await getIssueRows(query) : await getDisputeRows(query);
  const fileName = `smartrent-${type}-${date}.csv`;

  return new NextResponse(serializeCsv(rows), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

async function getIssueRows(query: { landlordId?: string }) {
  const issues = await IssueModel.find(query).sort({ createdAt: -1 }).lean();

  return [
    [
      "Issue ID",
      "Property ID",
      "Title",
      "Category",
      "Priority",
      "Status",
      "Created",
      "Updated",
    ],
    ...issues.map((issue) => [
      issue._id.toString(),
      issue.propertyId,
      issue.title,
      issue.category,
      issue.priority,
      issue.status,
      issue.createdAt,
      issue.updatedAt,
    ]),
  ];
}

async function getDisputeRows(query: { landlordId?: string }) {
  const disputes = await DisputeModel.find(query)
    .sort({ createdAt: -1 })
    .lean();

  return [
    [
      "Dispute reference",
      "Property ID",
      "Issue ID",
      "Title",
      "Priority",
      "Status",
      "Resolution notes",
      "Created",
      "Updated",
    ],
    ...disputes.map((dispute) => [
      dispute.disputeReference,
      dispute.propertyId,
      dispute.issueId,
      dispute.title,
      dispute.priority,
      dispute.status,
      dispute.resolutionNotes ?? "",
      dispute.createdAt,
      dispute.updatedAt,
    ]),
  ];
}
