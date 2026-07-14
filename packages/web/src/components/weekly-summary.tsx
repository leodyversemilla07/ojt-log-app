import { CalendarRange, ChevronRight, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklyBucket } from '@/lib/api';

interface WeeklySummaryCardProps {
  weeks: WeeklyBucket[] | null;
  loading: boolean;
  error?: string;
  targetHours: number;
}

function listItemStyle(_: WeeklyBucket) {
  // placeholder kept simple; styled inline below using semantic classes
  return '';
}

function fmtHours(h: number) {
  return h.toFixed(2);
}

export function WeeklySummaryCard({ weeks, loading, error, targetHours }: WeeklySummaryCardProps) {
  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="size-4 text-primary" /> Weekly summary
          </CardTitle>
          <CardDescription>Hours logged per week</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground text-sm py-6">
          <Loader2 className="size-4 animate-spin" />
          Loading weekly summary...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly summary unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive py-3">{error}</CardContent>
      </Card>
    );
  }

  if (!weeks || weeks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="size-4 text-primary" /> Weekly summary
          </CardTitle>
          <CardDescription>
            Add your first log and we'll start tracking your weekly rhythm here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // most recent week is last in the array (API returns asc by weekNumber)
  const current = weeks[weeks.length - 1];
  const previous = weeks.length >= 2 ? weeks[weeks.length - 2] : null;

  const maxHours = Math.max(...weeks.map((w) => w.totalHours), targetHours / 12, 1);

  const delta = previous ? current.totalHours - previous.totalHours : null;
  const deltaPercent =
    previous && previous.totalHours > 0 ? (delta ?? 0) / previous.totalHours : null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="size-4 text-primary" /> Weekly summary
            </CardTitle>
            <CardDescription>
              Hours logged per week across the last {weeks.length} weeks
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7">
            <Link to="/new">
              Add log
              <ChevronRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">This week</p>
            <p className="text-2xl font-bold tracking-tight">{fmtHours(current.totalHours)}h</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Week {current.weekNumber} • {current.daysLogged} day
              {current.daysLogged === 1 ? '' : 's'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last week</p>
            <p className="text-2xl font-bold tracking-tight text-muted-foreground">
              {previous ? `${fmtHours(previous.totalHours)}h` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {previous ? `Week ${previous.weekNumber}` : 'No data yet'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Delta</p>
            <div className="flex items-baseline gap-1">
              {delta == null ? (
                <span className="text-2xl font-bold text-muted-foreground">—</span>
              ) : (
                <>
                  <span
                    className={`text-2xl font-bold tracking-tight ${
                      delta > 0
                        ? 'text-green-600'
                        : delta < 0
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {delta > 0 ? '+' : ''}
                    {fmtHours(delta)}h
                  </span>
                  {delta > 0 ? (
                    <TrendingUp className="size-4 text-green-600" />
                  ) : delta < 0 ? (
                    <TrendingDown className="size-4 text-red-500" />
                  ) : null}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {deltaPercent == null
                ? 'Compared to last week'
                : `${deltaPercent > 0 ? '+' : ''}${fmtHours(deltaPercent * 100)}% vs last week`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Target pace</p>
            <p className="text-2xl font-bold tracking-tight">
              {(() => {
                if (!targetHours) return '—';
                // Compute target hours per week: totalHours / weeks active
                const totalHoursLogged = weeks.reduce((sum, w) => sum + w.totalHours, 0);
                const avgPerWeek = totalHoursLogged / weeks.length;
                const weeklyTarget = targetHours / 12; // assume ~12-week OJT
                const pct = (avgPerWeek / weeklyTarget) * 100;
                return `${pct.toFixed(0)}%`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg of recent pace</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Weeks
          </p>
          <ul className="space-y-1.5">
            {weeks
              .slice()
              .reverse()
              .map((w) => {
                const pct = Math.min((w.totalHours / maxHours) * 100, 100);
                const isCurrent = w.weekNumber === current.weekNumber;
                const style = listItemStyle(w);
                return (
                  <li
                    key={w.weekNumber}
                    className={`relative flex items-center gap-3 py-1 ${style}`}
                  >
                    <span
                      className={`text-xs w-12 shrink-0 ${
                        isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      Wk {w.weekNumber}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          isCurrent
                            ? 'bg-linear-to-r from-primary to-primary/70'
                            : 'bg-muted-foreground/50'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs tabular-nums w-20 text-right shrink-0 ${
                        isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {fmtHours(w.totalHours)}h • {w.daysLogged}d
                    </span>
                    {isCurrent ? (
                      <Badge variant="secondary" className="shrink-0">
                        Current
                      </Badge>
                    ) : (
                      <span className="w-12 shrink-0" />
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
