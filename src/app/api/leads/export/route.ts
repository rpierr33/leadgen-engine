import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    const where = jobId ? { jobId } : {};

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { job: { select: { query: true } } },
    });

    const csvData = leads.map((lead) => ({
      Name: lead.name,
      Role: lead.role || "",
      Email: lead.email || "",
      LinkedIn: lead.linkedin || "",
      Company: lead.company,
      Score: lead.score ?? "",
      "Score Reason": lead.scoreReason || "",
      "Source URL": lead.sourceUrl,
      "Search Query": lead.job.query,
      "Created At": lead.createdAt.toISOString(),
    }));

    const csv = Papa.unparse(csvData);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-${jobId || "all"}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export leads error:", error);
    return NextResponse.json(
      { error: "Failed to export leads" },
      { status: 500 }
    );
  }
}
