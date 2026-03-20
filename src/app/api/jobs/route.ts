import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    return NextResponse.json(
      jobs.map((job) => ({
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
      }))
    );
  } catch (error) {
    console.error("List jobs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
