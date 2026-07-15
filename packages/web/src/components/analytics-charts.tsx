import type { OJTLogEntry } from '@ojt-log/shared';
import { BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsChartsProps {
  logs: OJTLogEntry[];
  totalHours: number;
  targetHours: number;
}

export function AnalyticsCharts({ logs, totalHours, targetHours }: AnalyticsChartsProps) {
  const chartData = useMemo(() => {
    if (logs.length === 0) return { weeklyData: [], monthlyData: [], cumulativeTrend: [] };

    // Group by week
    const weekMap = new Map<
      number,
      { week: number; hours: number; days: number; avgHours: number }
    >();
    for (const log of logs) {
      const existing = weekMap.get(log.weekNumber);
      if (existing) {
        existing.hours += log.totalHours;
        existing.days += 1;
        existing.avgHours = existing.hours / existing.days;
      } else {
        weekMap.set(log.weekNumber, {
          week: log.weekNumber,
          hours: log.totalHours,
          days: 1,
          avgHours: log.totalHours,
        });
      }
    }
    const weeklyData = Array.from(weekMap.values()).sort((a, b) => a.week - b.week);

    // Group by month (YYYY-MM)
    const monthMap = new Map<string, { month: string; hours: number; days: number }>();
    for (const log of logs) {
      const month = log.date.slice(0, 7); // YYYY-MM
      const existing = monthMap.get(month);
      if (existing) {
        existing.hours += log.totalHours;
        existing.days += 1;
      } else {
        monthMap.set(month, { month, hours: log.totalHours, days: 1 });
      }
    }
    const monthlyData = Array.from(monthMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    // Full cumulative trend (all logs, oldest -> newest)
    const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    const cumulativeTrend = sortedLogs.map((log) => {
      cumulative += log.totalHours;
      return {
        date: log.date.slice(5), // MM-DD
        cumulative: Number(cumulative.toFixed(2)),
      };
    });

    return { weeklyData, monthlyData, cumulativeTrend };
  }, [logs]);

  const stats = useMemo(() => {
    if (logs.length === 0) {
      return { avgDaily: 0, maxDay: 0, totalDays: 0, weeksActive: 0, monthsActive: 0 };
    }

    const uniqueDays = new Set(logs.map((l) => l.date)).size;
    const uniqueWeeks = new Set(logs.map((l) => l.weekNumber)).size;
    const uniqueMonths = new Set(logs.map((l) => l.date.slice(0, 7))).size;
    const totalDayHours = logs.reduce((sum, l) => sum + l.totalHours, 0);

    return {
      avgDaily: totalDayHours / uniqueDays,
      maxDay: Math.max(...logs.map((l) => l.totalHours)),
      totalDays: uniqueDays,
      weeksActive: uniqueWeeks,
      monthsActive: uniqueMonths,
    };
  }, [logs]);

  if (logs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <BarChart3 className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>Add some logs to see analytics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Daily</p>
                <p className="text-2xl font-bold">{stats.avgDaily.toFixed(1)}h</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Max Day</p>
                <p className="text-2xl font-bold">{stats.maxDay.toFixed(1)}h</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Logged</p>
                <p className="text-2xl font-bold">{stats.totalDays}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">
                  {((totalHours / targetHours) * 100).toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekly Hours Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hours by Week</CardTitle>
            <CardDescription>Weekly hour distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="week" tickFormatter={(v) => `W${v}`} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}h`, 'Hours']}
                  labelFormatter={(label) => `Week ${label}`}
                />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Hours Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hours by Month</CardTitle>
            <CardDescription>Monthly hour distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v) => String(v).slice(2)} // YY-MM
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}h`, 'Hours']}
                  labelFormatter={(label) => `Month ${label}`}
                />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Progress toward Target */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cumulative Progress</CardTitle>
          <CardDescription>Total hours logged vs. your {targetHours}h target</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData.cumulativeTrend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value) => [`${Number(value)}h`, 'Total Hours']} />
              <Legend />
              <ReferenceLine
                y={targetHours}
                stroke="hsl(var(--destructive))"
                strokeDasharray="4 4"
                label={{
                  value: `Target ${targetHours}h`,
                  position: 'insideTopRight',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Total Hours"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
