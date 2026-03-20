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
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  UserCircle,
  Search,
  Linkedin,
} from "lucide-react";

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

interface LeadsTableProps {
  leads: Lead[];
  jobId?: string;
}

export function LeadsTable({ leads, jobId }: LeadsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-slate-400 hover:text-white -ml-4"
          >
            Name
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-purple-400 shrink-0" />
            <span className="font-medium text-white">{row.getValue("name")}</span>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-slate-400 hover:text-white -ml-4"
          >
            Role
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-slate-300">{row.getValue("role") || "—"}</span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.getValue("email") as string | null;
          if (!email) return <span className="text-slate-600">—</span>;
          return (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Mail className="h-3 w-3" />
              <span className="text-sm">{email}</span>
            </a>
          );
        },
      },
      {
        accessorKey: "company",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-slate-400 hover:text-white -ml-4"
          >
            Company
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-slate-200 font-medium">{row.getValue("company")}</span>
        ),
      },
      {
        accessorKey: "score",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-slate-400 hover:text-white -ml-4"
          >
            Score
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const score = row.getValue("score") as number | null;
          if (score === null) return <span className="text-slate-600">—</span>;
          const color =
            score >= 75
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : score >= 50
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20";
          return (
            <Badge variant="outline" className={color} title={row.original.scoreReason || ""}>
              {score}
            </Badge>
          );
        },
      },
      {
        accessorKey: "linkedin",
        header: "LinkedIn",
        cell: ({ row }) => {
          const linkedin = row.getValue("linkedin") as string | null;
          if (!linkedin) return <span className="text-slate-600">—</span>;
          return (
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          );
        },
      },
      {
        accessorKey: "sourceUrl",
        header: "Source",
        cell: ({ row }) => {
          const url = row.getValue("sourceUrl") as string;
          let displayUrl = url;
          try {
            displayUrl = new URL(url).hostname;
          } catch {
            // keep original
          }
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ExternalLink className="h-3 w-3" />
              {displayUrl}
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
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
    <Card className="border-white/10 bg-slate-900/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            Leads
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
              {leads.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Filter leads..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-9 w-full sm:w-64 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white shrink-0"
              disabled={leads.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-white/5 overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-white/5 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-slate-400 font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-slate-500"
                  >
                    {leads.length === 0
                      ? "No leads yet. Start a search to generate leads."
                      : "No results match your filter."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()} ({table.getFilteredRowModel().rows.length} leads)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="border-white/10 text-slate-400 hover:bg-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="border-white/10 text-slate-400 hover:bg-white/5"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
