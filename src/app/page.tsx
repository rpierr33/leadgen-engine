"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchHero } from "@/components/dashboard/SearchHero";
import { JobProgress } from "@/components/dashboard/JobProgress";
import { JobHistory } from "@/components/dashboard/JobHistory";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { Zap, Database, Cpu, Shield } from "lucide-react";

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
    <main className="min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-[oklch(0.07_0.015_270)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              LeadGen<span className="text-gradient">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Hero search */}
        <SearchHero onSearch={handleSearch} isLoading={isLoading} />

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-red-400 text-sm animate-slide-up">
            {error}
          </div>
        )}

        {/* Active job progress */}
        {activeJobId && isLoading && (
          <JobProgress
            jobId={activeJobId}
            onComplete={handleJobComplete}
            onCancel={handleJobCancel}
          />
        )}

        {/* Stats bar - show when there are leads */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up">
            {[
              { label: "Total Leads", value: leads.length, icon: Database, color: "purple" },
              { label: "With Email", value: leads.filter((l) => l.email).length, icon: Zap, color: "blue" },
              { label: "With LinkedIn", value: leads.filter((l) => l.linkedin).length, icon: Shield, color: "indigo" },
              { label: "Avg Score", value: leads.some((l) => l.score) ? Math.round(leads.reduce((acc, l) => acc + (l.score || 0), 0) / leads.filter((l) => l.score).length) : "—", icon: Cpu, color: "emerald" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="h-3.5 w-3.5 text-white/20" />
                  <span className="text-xs text-white/30 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Leads table */}
        <LeadsTable leads={leads} jobId={activeJobId || undefined} />

        {/* Job history */}
        <JobHistory jobs={jobs} onSelectJob={handleSelectJob} activeJobId={activeJobId} />

        {/* Footer */}
        <div className="text-center py-8 border-t border-white/[0.03]">
          <p className="text-[11px] text-white/15 max-w-lg mx-auto leading-relaxed">
            LeadGen AI collects only publicly available data. We respect robots.txt,
            implement rate limiting, and maintain full traceability logs for compliance.
          </p>
        </div>
      </div>
    </main>
  );
}
