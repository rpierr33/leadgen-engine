"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Users, X, Globe } from "lucide-react";

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
        if (
          data.status === "COMPLETED" ||
          data.status === "FAILED" ||
          data.status === "CANCELLED"
        ) {
          onComplete();
        }
      } catch {
        // silent
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
    } catch {
      // silent
    }
  };

  if (!job) return null;

  const progress =
    job.totalUrls > 0
      ? Math.round((job.processedUrls / job.totalUrls) * 100)
      : 0;

  const statusConfig: Record<string, { icon: typeof Clock; color: string; barColor: string; label: string }> = {
    PENDING: { icon: Clock, color: "text-amber-400", barColor: "bg-amber-500", label: "Queued" },
    RUNNING: { icon: Loader2, color: "text-purple-400", barColor: "bg-gradient-to-r from-purple-500 to-blue-500", label: "Scraping" },
    COMPLETED: { icon: CheckCircle2, color: "text-emerald-400", barColor: "bg-emerald-500", label: "Done" },
    FAILED: { icon: XCircle, color: "text-red-400", barColor: "bg-red-500", label: "Failed" },
    CANCELLED: { icon: XCircle, color: "text-white/30", barColor: "bg-white/20", label: "Cancelled" },
  };

  const config = statusConfig[job.status] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  return (
    <div className="glass-strong rounded-2xl p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-white/[0.04] ${config.color}`}>
            <StatusIcon
              className={`h-5 w-5 ${job.status === "RUNNING" ? "animate-spin" : ""}`}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {config.label}
              <span className="text-white/30 font-normal ml-2">
                &ldquo;{job.query}&rdquo;
                {job.industry && (
                  <span className="text-white/20"> in {job.industry}</span>
                )}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(job.status === "RUNNING" || job.status === "PENDING") && (
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-white/[0.04] overflow-hidden mb-4">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${config.barColor}`}
          style={{ width: `${progress}%` }}
        />
        {job.status === "RUNNING" && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[gradient-shift_2s_ease-in-out_infinite]" />
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-white/40">
          <Globe className="h-3.5 w-3.5" />
          <span>
            <span className="text-white font-medium">{job.processedUrls}</span>
            <span className="text-white/20">/{job.totalUrls}</span> URLs
          </span>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <Users className="h-3.5 w-3.5" />
          <span>
            <span className="text-white font-medium">{job.leadsCount}</span> leads
          </span>
        </div>
        <div className="text-white/20 text-xs ml-auto">{progress}%</div>
        {job.error && (
          <span className="text-red-400/70 text-xs">{job.error}</span>
        )}
      </div>
    </div>
  );
}
