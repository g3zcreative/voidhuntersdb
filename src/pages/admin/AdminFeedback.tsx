import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const EMOJIS = ["😡", "😕", "😐", "🙂", "😍"];

export default function AdminFeedback() {
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["feedback", ratingFilter, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      let q = supabase.from("feedback").select("*").order("created_at", { ascending: false });
      if (ratingFilter !== "all") q = q.eq("rating", Number(ratingFilter));
      if (dateFrom) q = q.gte("created_at", dateFrom.toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        q = q.lte("created_at", end.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const clearFilters = () => {
    setRatingFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = ratingFilter !== "all" || dateFrom || dateTo;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-6">Feedback</h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            {EMOJIS.map((e, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{e} {i + 1}/5</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" /> Clear
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">{rows.length} result{rows.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">No feedback yet.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Rating</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-48">Page</TableHead>
                <TableHead className="w-40">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-base px-2">
                      {EMOJIS[row.rating - 1]} {row.rating}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{row.message || <span className="text-muted-foreground italic">No message</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate">{row.page_url}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(row.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
