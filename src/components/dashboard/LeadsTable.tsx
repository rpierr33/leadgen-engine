"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  Search,
  Linkedin,
  User,
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

interface LeadsTableProps {
  leads: Lead[];
  jobId?: string;
}

export function LeadsTable({ leads, jobId }: LeadsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs font-medium uppercase tracking-wider"
          >
            Name
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-purple-300" />
            </div>
            <span className="font-medium text-white text-sm">{row.getValue("name")}</span>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs font-medium uppercase tracking-wider"
          >
            Role
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-white/50 text-sm">{row.getValue("role") || "—"}</span>
        ),
      },
      {
        accessorKey: "email",
        header: () => (
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Email</span>
        ),
        cell: ({ row }) => {
          const email = row.getValue("email") as string | null;
          if (!email) return <span className="text-white/15">—</span>;
          return (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1.5 text-blue-400/80 hover:text-blue-300 transition-colors text-sm group"
            >
              <Mail className="h-3 w-3 opacity-50 group-hover:opacity-100" />
              <span className="truncate max-w-[180px]">{email}</span>
            </a>
          );
        },
      },
      {
        accessorKey: "company",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs font-medium uppercase tracking-wider"
          >
            Company
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-white/70 text-sm font-medium">{row.getValue("company")}</span>
        ),
      },
      {
        accessorKey: "location",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs font-medium uppercase tracking-wider"
          >
            Location
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-white/50 text-sm">{row.getValue("location") || "—"}</span>
        ),
      },
      {
        accessorKey: "score",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs font-medium uppercase tracking-wider"
          >
            Score
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const score = row.getValue("score") as number | null;
          if (score === null) return <span className="text-white/15">—</span>;
          const color =
            score >= 75
              ? "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20"
              : score >= 50
                ? "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20"
                : "from-red-500/20 to-red-500/5 text-red-400 border-red-500/20";
          return (
            <div
              className={`inline-flex items-center px-2.5 py-0.5 rounded-lg bg-gradient-to-r border text-xs font-semibold ${color}`}
              title={row.original.scoreReason || ""}
            >
              {score}
            </div>
          );
        },
      },
      {
        accessorKey: "linkedin",
        header: () => (
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">LI</span>
        ),
        cell: ({ row }) => {
          const linkedin = row.getValue("linkedin") as string | null;
          if (!linkedin) return <span className="text-white/15">—</span>;
          return (
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400/60 hover:text-blue-300 transition-colors"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          );
        },
      },
      {
        accessorKey: "sourceUrl",
        header: () => (
          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Source</span>
        ),
        cell: ({ row }) => {
          const url = row.getValue("sourceUrl") as string;
          let display = url;
          try {
            display = new URL(url).hostname.replace("www.", "");
          } catch {
            // keep
          }
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-white/25 hover:text-white/50 transition-colors text-xs group"
            >
              <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
              {display}
            </a>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const handleExport = () => {
    const params = jobId ? `?jobId=${jobId}` : "";
    window.open(`/api/leads/export${params}`, "_blank");
  };

  return (
    <div className="glass rounded-2xl overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-white/60">Leads</h3>
          {leads.length > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20">
              {leads.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input
              placeholder="Filter leads..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full sm:w-56 h-9 pl-9 pr-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-500/30 transition-colors"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={leads.length === 0}
            className="h-9 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-sm hover:bg-white/[0.06] hover:text-white/70 transition-all disabled:opacity-30 flex items-center gap-2 shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/[0.03]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-6 py-3 first:pl-6"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-40 text-center text-white/20 text-sm"
                >
                  {leads.length === 0
                    ? "No leads yet. Run a search to get started."
                    : "No results match your filter."}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-3.5 first:pl-6">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="px-6 py-3 border-t border-white/[0.03] flex items-center justify-between">
          <p className="text-xs text-white/20">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()} &middot; {table.getFilteredRowModel().rows.length} leads
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/60 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/60 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
