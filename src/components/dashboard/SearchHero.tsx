"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Sparkles, Loader2 } from "lucide-react";

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

interface SearchHeroProps {
  onSearch: (query: string, industry?: string) => void;
  isLoading: boolean;
}

export function SearchHero({ onSearch, isLoading }: SearchHeroProps) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), industry === "Any Industry" ? undefined : industry || undefined);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-8 md:p-12">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-purple-600/20 blur-[100px] animate-pulse" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-blue-600/20 blur-[100px] animate-pulse delay-1000" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px] animate-pulse delay-500" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-purple-300">
            AI-Powered Lead Discovery
          </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-3">
          Discover High-Quality Leads{" "}
          <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Instantly
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-400 mb-8 max-w-2xl">
          Enter a niche, industry, or service — our AI engine scrapes the web,
          extracts contacts, and delivers enriched leads in minutes.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-3xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <Input
              type="text"
              placeholder="Enter a niche, industry, or service..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 text-base"
              disabled={isLoading}
            />
          </div>

          <Select value={industry} onValueChange={(val) => setIndustry(val ?? "")}>
            <SelectTrigger className="h-12 w-full sm:w-48 bg-white/5 border-white/10 text-white focus:border-purple-500">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {INDUSTRIES.map((ind) => (
                <SelectItem
                  key={ind}
                  value={ind}
                  className="text-white hover:bg-white/10 focus:bg-white/10"
                >
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="h-12 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Leads
              </>
            )}
          </Button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Only publicly available data is collected. We respect robots.txt and rate limits.
        </p>
      </div>
    </div>
  );
}
