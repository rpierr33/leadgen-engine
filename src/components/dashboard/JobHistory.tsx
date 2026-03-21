"use client";

import { History, ChevronRight, Users, CheckCircle2, Loader2, XCircle, Clock, Trash2 } from "lucide-react";

interface JobHistoryItem {
  id: string;
  query: string;
  industry: string | null;
  status: string;
  leadsCount: number;
  createdAt: string;
}

interface JobHistoryProps {
  jobs: JobHistoryItem[];
  onSelectJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  activeJobId?: string | null;
}

const statusIcons: Record<string, { icon: typeof Clock; color: string }> = {
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-400" },
  RUNNING: { icon: Loader2, color: "text-purple-400" },
  PENDING: { icon: Clock, color: "text-amber-400" },
  FAILED: { icon: XCircle, color: "text-red-400" },
  CANCELLED: { icon: XCircle, color: "text-white/20" },
};

export function JobHistory({ jobs, onSelectJob, onDeleteJob, activeJobId }: JobHistoryProps) {
  if (jobs.length === 0) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden animate-slide-up">
      <div className="px-6 py-4 border-b border-white/[0.04] flex items-center gap-3">
        <History className="h-4 w-4 text-white/30" />
        <h3 className="text-sm font-medium text-white/60">Recent Jobs</h3>
        <span className="text-xs text-white/20 ml-auto">{jobs.length} total</span>
      </div>

      <div className="divide-y divide-white/[0.03]">
        {jobs.map((job) => {
          const config = statusIcons[job.status] || statusIcons.PENDING;
          const Icon = config.icon;
          const isActive = activeJobId === job.id;

          return (
            <div
              key={job.id}
              className={`flex items-center gap-4 px-6 py-4 transition-all duration-200 hover:bg-white/[0.02] group ${
                isActive ? "bg-white/[0.03] border-l-2 border-purple-500" : ""
              }`}
            >
              <button
                onClick={() => onSelectJob(job.id)}
                className="flex items-center gap-4 flex-1 min-w-0 text-left"
              >
                <div className={`p-1.5 rounded-lg bg-white/[0.03] ${config.color}`}>
                  <Icon className={`h-3.5 w-3.5 ${job.status === "RUNNING" ? "animate-spin" : ""}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">
                    {job.query}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {job.industry && (
                      <span className="text-xs text-white/20">{job.industry}</span>
                    )}
                    <span className="text-xs text-white/15">
                      {new Date(job.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-white/30">
                  <Users className="h-3 w-3" />
                  {job.leadsCount}
                </div>
                <ChevronRight className="h-4 w-4 text-white/10 group-hover:text-white/30 transition-colors" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteJob(job.id);
                }}
                className="p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                title="Delete job"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
