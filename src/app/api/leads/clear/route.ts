import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    // Delete leads for the job
    await prisma.lead.deleteMany({
      where: { jobId },
    });

    // Delete trace logs for the job
    await prisma.traceLog.deleteMany({
      where: { jobId },
    });

    // Delete the job itself
    await prisma.job.delete({
      where: { id: jobId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Clear] Error:", error);
    return NextResponse.json(
      { error: "Failed to clear leads" },
      { status: 500 }
    );
  }
}
