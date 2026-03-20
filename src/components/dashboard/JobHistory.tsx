"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, ChevronRight, Users } from "lucide-react";

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
}

const statusColors: Record<string, string> = {
  COMPLETED: "bg-green-500/10 text-green-400 border-green-500/20",
  RUNNING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export function JobHistory({ jobs, onSelectJob }: JobHistoryProps) {
  if (jobs.length === 0) return null;

  return (
    <Card className="border-white/10 bg-slate-900/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <History className="h-5 w-5 text-slate-400" />
          Job History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {jobs.map((job) => (
          <Button
            key={job.id}
            variant="ghost"
            onClick={() => onSelectJob(job.id)}
            className="w-full justify-between h-auto py-3 px-4 hover:bg-white/5 text-left"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-white">{job.query}</span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {job.industry && <span>{job.industry}</span>}
                <span>{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Users className="h-3 w-3" />
                {job.leadsCount}
              </div>
              <Badge variant="outline" className={statusColors[job.status] || statusColors.PENDING}>
                {job.status}
              </Badge>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
