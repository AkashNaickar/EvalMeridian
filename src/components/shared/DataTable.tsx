"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessorKey: keyof T | string;
    cell?: (item: T) => React.ReactNode;
    className?: string;
  }[];
  className?: string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  className,
  onRowClick,
  isLoading,
  emptyMessage = "No results found.",
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full h-32 flex items-center justify-center border rounded-lg bg-white/50 animate-pulse">
        <div className="text-slate-400 font-medium text-xs">Loading data...</div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm", className)}>
      <Table>
        <TableHeader className="bg-slate-50 border-b">
          <TableRow className="hover:bg-transparent">
            {columns.map((column, i) => (
              <TableHead 
                key={i} 
                className={cn(
                  "h-10 text-[10px] uppercase font-bold tracking-wider text-slate-500",
                  column.className
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, i) => (
              <TableRow
                key={i}
                className={cn(
                  "h-10 transition-colors cursor-default",
                  i % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                  onRowClick && "cursor-pointer hover:bg-slate-50",
                  "border-slate-100"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column, j) => (
                  <TableCell key={j} className={cn("py-2 px-4 text-[13px] text-slate-600", column.className)}>
                    {column.cell
                      ? column.cell(item)
                      : (item[column.accessorKey as keyof T] as React.ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-slate-400 text-sm"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
