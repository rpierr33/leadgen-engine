import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        leads: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { leads: true, traceLogs: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      query: job.query,
      industry: job.industry,
      status: job.status,
      totalUrls: job.totalUrls,
      processedUrls: job.processedUrls,
      leadsCount: job._count.leads,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error,
      leads: job.leads,
    });
  } catch (error) {
    console.error("Get job error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.job.update({
      where: { id },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Job cancelled" });
  } catch (error) {
    console.error("Cancel job error:", error);
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
