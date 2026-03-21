"use client";

import { useState } from "react";
import { Search, Sparkles, Loader2, ArrowRight, SlidersHorizontal, Check } from "lucide-react";

const INDUSTRIES = [
  "Any Industry",
  "Technology",
  "Healthcare",
  "Finance",
  "Real Estate",
  "Marketing",
  "Legal",
  "E-Commerce",
  "Education",
  "SaaS",
  "Construction",
  "Hospitality",
  "Manufacturing",
  "Consulting",
  "Insurance",
];

const LIMITS = [5, 10, 15, 25, 50];
const MIN_QUALITY_OPTIONS = [0, 25, 50, 75] as const;

interface SourceOption {
  key: string;
  label: string;
  desc: string;
  industries?: string[]; // only show for these industries, undefined = always
}

const ALL_SOURCES: SourceOption[] = [
  { key: "web", label: "Web", desc: "Company team & about pages" },
  { key: "social", label: "Social", desc: "Facebook, Instagram, LinkedIn" },
  { key: "healthgrades", label: "Healthgrades", desc: "Provider directory", industries: ["Healthcare"] },
  { key: "vitals", label: "Vitals", desc: "Provider ratings", industries: ["Healthcare"] },
  { key: "ahca", label: "FL Health (AHCA)", desc: "Florida licensed providers", industries: ["Healthcare"] },
  { key: "bbb", label: "BBB", desc: "Better Business Bureau" },
];

interface SearchHeroProps {
  onSearch: (query: string, industry?: string, limit?: number, sources?: string[], minQuality?: number) => void;
  isLoading: boolean;
}

export function SearchHero({ onSearch, isLoading }: SearchHeroProps) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [limit, setLimit] = useState(10);
  const [selectedSources, setSelectedSources] = useState<string[]>(["web", "social"]);
  const [minQuality, setMinQuality] = useState<number>(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const toggleSource = (key: string) => {
    setSelectedSources((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const currentIndustry = industry && industry !== "Any Industry" ? industry : undefined;

  // Filter sources by industry
  const availableSources = ALL_SOURCES.filter(
    (s) => !s.industries || (currentIndustry && s.industries.includes(currentIndustry))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const sources = selectedSources.length > 0 ? selectedSources : ["web"];
    onSearch(
      query.trim(),
      currentIndustry,
      limit,
      sources,
      minQuality > 0 ? minQuality : undefined
    );
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-[oklch(0.16_0.03_270)] to-blue-900/40" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-purple-600/15 blur-[120px] animate-pulse-glow" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-600/15 blur-[120px] animate-float-delayed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/8 blur-[150px] animate-float" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 px-6 py-14 sm:px-12 sm:py-18 lg:px-16 lg:py-20">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-6 animate-slide-up">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-purple-500/20">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs font-medium text-purple-300 tracking-wide uppercase">
              AI-Powered Lead Discovery
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-4">
            Discover Leads
            <br />
            <span className="text-gradient">Instantly with AI</span>
          </h1>
          <p className="text-lg text-white/40 max-w-xl mb-8 leading-relaxed">
            Enter any niche, industry, or service. Get enriched business
            contacts from multiple sources — export and move on.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div
            className={`flex flex-col sm:flex-row gap-3 p-2 rounded-2xl transition-all duration-500 ${
              isFocused ? "glass-strong glow-purple" : "glass"
            }`}
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <input
                type="text"
                placeholder='e.g. "nurse registries in broward county"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isLoading}
                className="w-full h-12 sm:h-14 pl-12 pr-4 bg-transparent text-white placeholder:text-white/25 text-base sm:text-lg focus:outline-none disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-12 sm:h-14 px-4 rounded-xl border text-sm transition-all flex items-center gap-2 shrink-0 ${
                showFilters
                  ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                  : "bg-white/[0.04] border-white/[0.06] text-white/40 hover:text-white/60"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {selectedSources.length > 1 && (
                <span className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-300 text-[10px] flex items-center justify-center font-bold">
                  {selectedSources.length}
                </span>
              )}
            </button>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="group h-12 sm:h-14 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-sm sm:text-base transition-all duration-300 hover:from-purple-500 hover:to-blue-500 hover:shadow-[0_0_30px_oklch(0.55_0.25_270/40%)] disabled:opacity-40 disabled:hover:shadow-none flex items-center justify-center gap-2 shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 mt-4 px-2 animate-slide-up">
              {/* Industry */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/25 pl-1">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/70 text-sm focus:outline-none focus:border-purple-500/30 appearance-none cursor-pointer w-44"
                >
                  <option value="" className="bg-[#1e1e2e]">Any</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind} className="bg-[#1e1e2e]">{ind}</option>
                  ))}
                </select>
              </div>

              {/* Max Leads */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/25 pl-1">Max Companies</label>
                <div className="flex gap-1">
                  {LIMITS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLimit(l)}
                      className={`h-10 w-12 rounded-xl text-sm font-medium transition-all ${
                        limit === l
                          ? "bg-purple-500/20 border border-purple-500/30 text-purple-300"
                          : "bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min Score */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/25 pl-1">Min Score</label>
                <div className="flex gap-1">
                  {MIN_QUALITY_OPTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setMinQuality(q)}
                      className={`h-10 w-12 rounded-xl text-sm font-medium transition-all ${
                        minQuality === q
                          ? "bg-purple-500/20 border border-purple-500/30 text-purple-300"
                          : "bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sources — multi-select */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] uppercase tracking-widest text-white/25 pl-1">
                  Sources <span className="text-white/15">— select multiple</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSources.map((source) => {
                    const isSelected = selectedSources.includes(source.key);
                    return (
                      <button
                        key={source.key}
                        type="button"
                        onClick={() => toggleSource(source.key)}
                        className={`h-10 px-3.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          isSelected
                            ? "bg-purple-500/20 border border-purple-500/30 text-purple-300"
                            : "bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-purple-500 border-purple-500"
                            : "border-white/20 bg-transparent"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span>{source.label}</span>
                        <span className="text-[10px] text-white/20 hidden sm:inline">{source.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          {["Respects robots.txt", "Rate limited", "Public data only", "Full traceability"].map((t) => (
            <div key={t} className="flex items-center gap-2 text-xs text-white/25">
              <div className="w-1 h-1 rounded-full bg-green-400/60" />
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
