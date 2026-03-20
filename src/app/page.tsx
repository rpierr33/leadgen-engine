"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchHero } from "@/components/dashboard/SearchHero";
import { JobProgress } from "@/components/dashboard/JobProgress";
import { JobHistory } from "@/components/dashboard/JobHistory";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { Zap } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedin: string | null;
  company: string;
  score: number | null;
  scoreReason: string | null;
  sourceUrl: string;
}

interface JobHistoryItem {
  id: string;
  query: string;
  industry: string | null;
  status: string;
  leadsCount: number;
  createdAt: string;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [jobs, setJobs] = useState<JobHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (Array.isArray(data)) setJobs(data);
    } catch {
      // silent
    }
  }, []);

  const fetchLeads = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = async (query: string, industry?: string) => {
    setIsLoading(true);
    setError(null);
    setLeads([]);

    try {
      const res = await fetch("/api/leads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, industry }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start lead generation");
      }

      setActiveJobId(data.jobId);

      if (data.status === "COMPLETED") {
        setIsLoading(false);
        fetchJobs();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const handleJobComplete = useCallback(() => {
    setIsLoading(false);
    if (activeJobId) {
      fetchLeads(activeJobId);
    }
    fetchJobs();
  }, [activeJobId, fetchLeads, fetchJobs]);

  const handleJobCancel = () => {
    setIsLoading(false);
    setActiveJobId(null);
    fetchJobs();
  };

  const handleSelectJob = (jobId: string) => {
    setActiveJobId(jobId);
    fetchLeads(jobId);
  };

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                LeadGen
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  AI
                </span>
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            AI-Powered Lead Discovery Engine
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <SearchHero onSearch={handleSearch} isLoading={isLoading} />

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {activeJobId && isLoading && (
          <JobProgress
            jobId={activeJobId}
            onComplete={handleJobComplete}
            onCancel={handleJobCancel}
          />
        )}

        <LeadsTable leads={leads} jobId={activeJobId || undefined} />

        <JobHistory jobs={jobs} onSelectJob={handleSelectJob} />

        {/* Disclaimer */}
        <div className="text-center py-6 border-t border-white/5">
          <p className="text-xs text-slate-600 max-w-2xl mx-auto">
            This tool only collects publicly available data. We respect robots.txt
            directives and implement rate limiting. Users are responsible for
            ensuring compliance with applicable laws and regulations regarding
            data collection and usage in their jurisdiction.
          </p>
        </div>
      </div>
    </main>
  );
}
