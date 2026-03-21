"use client";

import { useState, useMemo } from "react";
import {
  Download,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  Search,
  Linkedin,
  User,
  Users,
  Building2,
  MapPin,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  company: string;
  domain?: string;
  location: string | null;
  score: number | null;
  scoreReason: string | null;
  sourceUrl: string;
}

interface CompanyGroup {
  domain: string;
  company: string;
  location: string | null;
  sourceUrl: string;
  primary: Lead; // highest-scored contact
  contacts: Lead[]; // all contacts including primary
  bestScore: number;
}

interface LeadsTableProps {
  leads: Lead[];
  jobId?: string;
}

function getDomain(lead: Lead): string {
  if (lead.domain) return lead.domain;
  try {
    return new URL(lead.sourceUrl).hostname.replace("www.", "");
  } catch {
    return lead.company.toLowerCase().replace(/\s+/g, "");
  }
}

export function LeadsTable({ leads, jobId }: LeadsTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"score" | "company" | "contacts">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Group leads by domain
  const groups = useMemo<CompanyGroup[]>(() => {
    const map = new Map<string, Lead[]>();
    for (const lead of leads) {
      const domain = getDomain(lead);
      const existing = map.get(domain) || [];
      existing.push(lead);
      map.set(domain, existing);
    }

    return [...map.entries()].map(([domain, contacts]) => {
      const sorted = [...contacts].sort((a, b) => (b.score || 0) - (a.score || 0));
      const primary = sorted[0];
      return {
        domain,
        company: primary.company,
        location: primary.location,
        sourceUrl: primary.sourceUrl,
        primary,
        contacts: sorted,
        bestScore: primary.score || 0,
      };
    });
  }, [leads]);

  // Filter
  const filtered = useMemo(() => {
    if (!globalFilter) return groups;
    const q = globalFilter.toLowerCase();
    return groups.filter(
      (g) =>
        g.company.toLowerCase().includes(q) ||
        g.domain.includes(q) ||
        g.contacts.some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.role || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q)
        )
    );
  }, [groups, globalFilter]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "score") cmp = a.bestScore - b.bestScore;
      else if (sortBy === "company") cmp = a.company.localeCompare(b.company);
      else if (sortBy === "contacts") cmp = a.contacts.length - b.contacts.length;
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const toggleExpand = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const toggleSort = (key: "score" | "company" | "contacts") => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
  };

  const handleExport = () => {
    const params = jobId ? `?jobId=${jobId}` : "";
    window.open(`/api/leads/export${params}`, "_blank");
  };

  const ScoreBadge = ({ score, reason }: { score: number | null; reason?: string | null }) => {
    if (score === null) return <span className="text-white/15">—</span>;
    const color =
      score >= 75
        ? "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20"
        : score >= 50
          ? "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20"
          : "from-red-500/20 to-red-500/5 text-red-400 border-red-500/20";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-lg bg-gradient-to-r border text-xs font-semibold ${color}`}
        title={reason || ""}
      >
        {score}
      </span>
    );
  };

  return (
    <div className="glass rounded-2xl overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-white/60">Leads</h3>
          {groups.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20">
                {groups.length} {groups.length === 1 ? "company" : "companies"}
              </span>
              <span className="text-xs text-white/20">
                {leads.length} contacts
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input
              placeholder="Filter..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full sm:w-48 h-9 pl-9 pr-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-500/30"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={leads.length === 0}
            className="h-9 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-sm hover:bg-white/[0.06] hover:text-white/70 transition-all disabled:opacity-30 flex items-center gap-2 shrink-0"
          >
            <Download className="h-3.5 w-3.5" />CSV
          </button>
        </div>
      </div>

      {/* Sort headers */}
      <div className="grid grid-cols-[1fr_120px_80px_80px] sm:grid-cols-[1fr_200px_120px_80px_80px] px-6 py-2.5 border-b border-white/[0.03] text-[10px] uppercase tracking-wider text-white/25 font-medium">
        <button onClick={() => toggleSort("company")} className="text-left hover:text-white/50 transition-colors flex items-center gap-1">
          Company {sortBy === "company" && (sortDir === "desc" ? "↓" : "↑")}
        </button>
        <span className="hidden sm:block">Primary Contact</span>
        <span>Location</span>
        <button onClick={() => toggleSort("contacts")} className="text-center hover:text-white/50 transition-colors">
          Contacts {sortBy === "contacts" && (sortDir === "desc" ? "↓" : "↑")}
        </button>
        <button onClick={() => toggleSort("score")} className="text-center hover:text-white/50 transition-colors">
          Score {sortBy === "score" && (sortDir === "desc" ? "↓" : "↑")}
        </button>
      </div>

      {/* Company rows */}
      <div className="divide-y divide-white/[0.02]">
        {sorted.length === 0 ? (
          <div className="px-6 py-16 text-center text-white/20 text-sm">
            {leads.length === 0 ? "No leads yet. Run a search to get started." : "No results match your filter."}
          </div>
        ) : (
          sorted.map((group) => {
            const isExpanded = expandedDomains.has(group.domain);
            const hasMultiple = group.contacts.length > 1;

            return (
              <div key={group.domain}>
                {/* Company row */}
                <button
                  onClick={() => hasMultiple && toggleExpand(group.domain)}
                  className={`w-full grid grid-cols-[1fr_120px_80px_80px] sm:grid-cols-[1fr_200px_120px_80px_80px] px-6 py-3.5 text-left hover:bg-white/[0.015] transition-colors items-center ${hasMultiple ? "cursor-pointer" : "cursor-default"}`}
                >
                  {/* Company name + domain */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/15 to-blue-500/15 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-purple-300/70" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {hasMultiple && (
                          isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            : <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-white truncate">{group.company}</span>
                      </div>
                      <a
                        href={group.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[11px] text-white/20 hover:text-white/40 mt-0.5"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />{group.domain}
                      </a>
                    </div>
                  </div>

                  {/* Primary contact */}
                  <div className="hidden sm:flex items-center gap-2 min-w-0">
                    <User className="h-3 w-3 text-white/20 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-white/70 truncate">{group.primary.name}</p>
                      <p className="text-[10px] text-white/30 truncate">{group.primary.role || "—"}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1 text-xs text-white/30">
                    {group.location ? (
                      <><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{group.location}</span></>
                    ) : "—"}
                  </div>

                  {/* Contact count */}
                  <div className="flex items-center justify-center gap-1 text-xs text-white/30">
                    <Users className="h-3 w-3" />
                    {group.contacts.length}
                  </div>

                  {/* Score */}
                  <div className="flex justify-center">
                    <ScoreBadge score={group.bestScore} reason={group.primary.scoreReason} />
                  </div>
                </button>

                {/* Expanded contacts */}
                {isExpanded && (
                  <div className="bg-white/[0.01] border-t border-white/[0.02]">
                    {group.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="grid grid-cols-[1fr_1fr_1fr_1fr_80px] px-6 py-2.5 pl-20 items-center border-b border-white/[0.01] last:border-0 hover:bg-white/[0.01]"
                      >
                        {/* Name + Role */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 text-white/20" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-white/70 truncate">{contact.name}</p>
                            <p className="text-[10px] text-white/25 truncate">{contact.role || "—"}</p>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="min-w-0">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-[11px] text-blue-400/70 hover:text-blue-300 truncate">
                              <Mail className="h-3 w-3 shrink-0" />{contact.email}
                            </a>
                          ) : <span className="text-[11px] text-white/15">—</span>}
                        </div>

                        {/* Phone */}
                        <div className="min-w-0">
                          {contact.phone ? (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/70 truncate">
                              <Phone className="h-3 w-3 shrink-0" />{contact.phone}
                            </a>
                          ) : <span className="text-[11px] text-white/15">—</span>}
                        </div>

                        {/* LinkedIn */}
                        <div>
                          {contact.linkedin ? (
                            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400/50 hover:text-blue-300">
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          ) : <span className="text-[11px] text-white/15">—</span>}
                        </div>

                        {/* Score */}
                        <div className="flex justify-center">
                          <ScoreBadge score={contact.score} reason={contact.scoreReason} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
