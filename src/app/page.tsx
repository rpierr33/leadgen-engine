"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchHero } from "@/components/dashboard/SearchHero";
import { JobHistory } from "@/components/dashboard/JobHistory";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import {
  Zap,
  Database,
  Cpu,
  Mail,
  Loader2,
  Download,
  RefreshCw,
  Trash2,
  Clock,
  Shield,
  Eraser,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedin: string | null;
  company: string;
  location: string | null;
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dataRetention, setDataRetention] = useState<string>("Auto-Expire (3 days)");

  // Pagination state
  const [lastQuery, setLastQuery] = useState("");
  const [lastIndustry, setLastIndustry] = useState<string | undefined>();
  const [lastLimit, setLastLimit] = useState(10);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [totalUrlsFound, setTotalUrlsFound] = useState(0);

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

  const handleSearch = async (
    query: string,
    industry?: string,
    limit?: number,
    mode?: string,
    socialPlatform?: string,
    minQuality?: number,
    offset?: number
  ) => {
    setIsLoading(true);
    setError(null);
    setStatusMessage("Searching the web...");

    // If not a "load more", clear leads
    if (!offset) {
      setLeads([]);
      setNextOffset(null);
    }

    setLastQuery(query);
    setLastIndustry(industry);
    setLastLimit(limit || 10);

    try {
      const res = await fetch("/api/leads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          industry,
          limit: limit || 10,
          offset: offset || 0,
          mode,
          socialPlatform,
          minQuality,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate leads");
      }

      setActiveJobId(data.jobId);
      setTotalUrlsFound(data.totalUrlsFound || 0);
      setNextOffset(data.nextOffset);

      if (offset && offset > 0) {
        // Append new leads
        setLeads((prev) => [...prev, ...(data.leads || [])]);
      } else {
        setLeads(data.leads || []);
      }

      setStatusMessage(null);
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleLoadMore = () => {
    if (nextOffset !== null && lastQuery) {
      handleSearch(lastQuery, lastIndustry, lastLimit, undefined, undefined, undefined, nextOffset);
    }
  };

  const handleSelectJob = (jobId: string) => {
    setActiveJobId(jobId);
    fetchLeads(jobId);
    setNextOffset(null);
  };

  const handleClearLeads = () => {
    setLeads([]);
    setActiveJobId(null);
    setNextOffset(null);
    setTotalUrlsFound(0);
  };

  const handleExport = () => {
    const params = activeJobId ? `?jobId=${activeJobId}` : "";
    window.open(`/api/leads/export${params}`, "_blank");
  };

  const handleDeleteAfterExport = async () => {
    handleExport();
    if (activeJobId) {
      try {
        await fetch(`/api/leads/clear?jobId=${activeJobId}`, { method: "DELETE" });
        setLeads([]);
        setActiveJobId(null);
        setNextOffset(null);
        setTotalUrlsFound(0);
        fetchJobs();
      } catch {
        // silent
      }
    }
  };

  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[oklch(0.14_0.01_270)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              LeadGen<span className="text-gradient">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {leads.length > 0 && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all"
                >
                  <Download className="h-3 w-3" />
                  Export CSV
                </button>
                <button
                  onClick={handleClearLeads}
                  className="flex items-center gap-2 h-8 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/30 text-xs hover:text-red-400 hover:border-red-500/20 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              </>
            )}
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

        {/* Loading state */}
        {isLoading && (
          <div className="glass-strong rounded-2xl p-6 animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {statusMessage || "Processing..."}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  Scraping pages, extracting contacts with AI, enriching emails...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-red-400 text-sm animate-slide-up">
            {error}
          </div>
        )}

        {/* Stats bar */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up">
            {[
              {
                label: "Total Leads",
                value: leads.length,
                icon: Database,
                note: dataRetention === "Auto-Expire (3 days)" ? "auto-expires in 3 days" : undefined,
              },
              {
                label: "With Email",
                value: leads.filter((l) => l.email).length,
                icon: Mail,
              },
              {
                label: "URLs Found",
                value: totalUrlsFound,
                icon: Cpu,
              },
              {
                label: "Avg Score",
                value: leads.some((l) => l.score)
                  ? Math.round(
                      leads.reduce((acc, l) => acc + (l.score || 0), 0) /
                        leads.filter((l) => l.score).length
                    )
                  : "—",
                icon: Zap,
              },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="h-3.5 w-3.5 text-white/20" />
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                {"note" in stat && stat.note && (
                  <p className="text-[10px] text-white/20 mt-0.5">{stat.note}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Leads table */}
        <LeadsTable leads={leads} jobId={activeJobId || undefined} />

        {/* Load More */}
        {nextOffset !== null && !isLoading && leads.length > 0 && (
          <div className="flex justify-center animate-slide-up">
            <button
              onClick={handleLoadMore}
              className="flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white font-medium text-sm hover:from-purple-500 hover:to-blue-500 hover:shadow-[0_0_25px_oklch(0.55_0.25_270/30%)] transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Load More Leads
              <span className="text-white/40 text-xs ml-1">
                ({totalUrlsFound - nextOffset} URLs remaining)
              </span>
            </button>
          </div>
        )}

        {/* Export reminder */}
        {leads.length > 0 && (
          <div className="glass rounded-xl px-5 py-4 flex items-center justify-between animate-slide-up">
            <div>
              <p className="text-sm text-white/60">
                <span className="text-white font-medium">{leads.length} leads</span> ready to export
              </p>
              <p className="text-xs text-white/25 mt-0.5">
                Download as CSV to use in your CRM, email tool, or spreadsheet.
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 h-10 px-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all shrink-0"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          </div>
        )}

        {/* Data Retention */}
        {leads.length > 0 && (
          <div className="glass rounded-xl px-5 py-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-3.5 w-3.5 text-white/30" />
              <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Data Retention</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setDataRetention("Delete After Export");
                  handleDeleteAfterExport();
                }}
                className={`flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-medium transition-all ${
                  dataRetention === "Delete After Export"
                    ? "bg-red-500/15 border border-red-500/25 text-red-400"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50"
                }`}
              >
                <Eraser className="h-3 w-3" />
                Delete After Export
              </button>
              <button
                onClick={() => setDataRetention("Auto-Expire (3 days)")}
                className={`flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-medium transition-all ${
                  dataRetention === "Auto-Expire (3 days)"
                    ? "bg-amber-500/15 border border-amber-500/25 text-amber-400"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50"
                }`}
              >
                <Clock className="h-3 w-3" />
                Auto-Expire (3 days)
              </button>
              <button
                onClick={() => setDataRetention("Keep Until Deleted")}
                className={`flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-medium transition-all ${
                  dataRetention === "Keep Until Deleted"
                    ? "bg-blue-500/15 border border-blue-500/25 text-blue-400"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50"
                }`}
              >
                <Database className="h-3 w-3" />
                Keep Until Deleted
              </button>
            </div>
            {dataRetention === "Auto-Expire (3 days)" && (
              <p className="text-[11px] text-white/20 mt-2">
                Data will be automatically deleted 3 days after generation.
              </p>
            )}
          </div>
        )}

        {/* Job history */}
        <JobHistory
          jobs={jobs}
          onSelectJob={handleSelectJob}
          activeJobId={activeJobId}
        />

        {/* Footer */}
        <div className="text-center py-8 border-t border-white/[0.03]">
          <p className="text-[11px] text-white/15 max-w-lg mx-auto leading-relaxed">
            LeadGen AI collects only publicly available data. We respect
            robots.txt, implement rate limiting, and maintain full traceability
            logs for compliance.
          </p>
        </div>
      </div>
    </main>
  );
}
