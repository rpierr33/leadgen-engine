"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, Users, X } from "lucide-react";

interface JobProgressProps {
  jobId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface JobData {
  id: string;
  query: string;
  industry: string | null;
  status: string;
  totalUrls: number;
  processedUrls: number;
  leadsCount: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

export function JobProgress({ jobId, onComplete, onCancel }: JobProgressProps) {
  const [job, setJob] = useState<JobData | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        setJob(data);

        if (data.status === "COMPLETED" || data.status === "FAILED" || data.status === "CANCELLED") {
          onComplete();
        }
      } catch (err) {
        console.error("Failed to fetch job:", err);
      }
    };

    fetchJob();
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  const handleCancel = async () => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      onCancel();
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
  };

  if (!job) return null;

  const progress = job.totalUrls > 0
    ? Math.round((job.processedUrls / job.totalUrls) * 100)
    : 0;

  const statusConfig = {
    PENDING: { icon: Clock, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "Pending" },
    RUNNING: { icon: Loader2, color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Running" },
    COMPLETED: { icon: CheckCircle2, color: "bg-green-500/10 text-green-400 border-green-500/20", label: "Completed" },
    FAILED: { icon: XCircle, color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Failed" },
    CANCELLED: { icon: XCircle, color: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "Cancelled" },
  };

  const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  return (
    <Card className="border-white/10 bg-slate-900/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${job.status === "RUNNING" ? "animate-spin" : ""} ${config.color.split(" ")[1]}`} />
            Job Progress
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
            {(job.status === "RUNNING" || job.status === "PENDING") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-slate-400 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Searching: <span className="text-white font-medium">{job.query}</span>
            {job.industry && (
              <span className="text-slate-500"> in {job.industry}</span>
            )}
          </span>
          <span className="text-slate-400">
            {job.processedUrls}/{job.totalUrls} URLs
          </span>
        </div>

        <Progress
          value={progress}
          className="h-2 bg-slate-800"
        />

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users className="h-4 w-4" />
            <span>
              <span className="text-white font-semibold">{job.leadsCount}</span> leads found
            </span>
          </div>
          {job.error && (
            <span className="text-red-400 text-xs">{job.error}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
