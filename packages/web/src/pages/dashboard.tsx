import type { OJTLogEntry } from '@ojt-log/shared';
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Filter,
  PlusCircle,
  Search,
  Settings,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AnalyticsCharts } from '@/components/analytics-charts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { WeeklySummaryCard } from '@/components/weekly-summary';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import type { LogFilters, WeeklyBucket } from '@/lib/api';
import { logsApi } from '@/lib/api';
import {
  deleteLog,
  exportLogsAsCsv,
  getLogs,
  getTargetHours,
  getTotalHoursLogged,
  hasLegacyLocalLogs,
  importLegacyLocalLogs,
  setTargetHours,
} from '@/lib/storage';

export function Dashboard() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<OJTLogEntry[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [targetHours, setTargetHoursState] = useState(() => getTargetHours());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetInput, setTargetInput] = useState(targetHours.toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [weekFilter, setWeekFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<LogFilters>({});

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Weekly summary
  const [weeklyBuckets, setWeeklyBuckets] = useState<WeeklyBucket[] | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState<string>('');

  const fetchLogs = useCallback(
    async (pageNum: number, isInitial = false, filters?: LogFilters) => {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const result = await getLogs(pageNum, filters);
        if (isInitial) {
          setLogs(result.logs);
        } else {
          setLogs((prev) => [...prev, ...result.logs]);
        }
        setHasMore(result.hasMore);
        setPage(pageNum);
        setHasLegacyData(hasLegacyLocalLogs());
        setLoadError('');
      } catch (error) {
        const text = error instanceof Error ? error.message : 'Failed to load logs.';
        setLoadError(text);
        toast.error(text);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  const fetchTotalHours = useCallback(async () => {
    try {
      const hours = await getTotalHoursLogged();
      setTotalHours(hours);
    } catch (error) {
      console.error('Failed to fetch total hours', error);
    }
  }, []);

  const fetchWeeklySummary = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const summary = await logsApi.getWeeklySummary(8);
      setWeeklyBuckets(summary.weeks);
      setWeeklyError('');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Failed to load weekly summary.';
      setWeeklyError(text);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchLogs(0, true, activeFilters).then(() => {
      if (active) fetchTotalHours();
    });
    fetchWeeklySummary();
    return () => {
      active = false;
    };
  }, [fetchLogs, fetchTotalHours, fetchWeeklySummary, activeFilters]);

  function handleLoadMore() {
    fetchLogs(page + 1, false, activeFilters);
  }

  function handleApplyFilters() {
    const filters: LogFilters = {};
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (dateFilter.start) filters.startDate = dateFilter.start;
    if (dateFilter.end) filters.endDate = dateFilter.end;
    if (weekFilter) filters.weekNumber = parseInt(weekFilter, 10);
    setActiveFilters(filters);
    fetchLogs(0, true, filters);
  }

  function handleClearFilters() {
    setSearchQuery('');
    setDateFilter({ start: '', end: '' });
    setWeekFilter('');
    setActiveFilters({});
    fetchLogs(0, true, {});
  }

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  async function handleImportLegacyLogs() {
    setImporting(true);
    setImportMessage('');
    try {
      const result = await importLegacyLocalLogs();
      const refreshed = await getLogs(0);
      setLogs(refreshed.logs);
      setHasMore(refreshed.hasMore);
      setHasLegacyData(false);
      fetchTotalHours();
      setImportMessage(`Imported ${result.imported} local log(s) to your account.`);
      toast.success(`Imported ${result.imported} local log(s).`);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Import failed.';
      setImportMessage(text);
      toast.error(text);
    } finally {
      setImporting(false);
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleIds = logs.map((l) => l.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await deleteLog(id);
        succeeded++;
      } catch (e) {
        console.error('Failed to delete log:', id, e);
        failed++;
      }
    }
    setLogs((prev) => prev.filter((l) => !selectedIds.has(l.id)));
    setBulkDeleteOpen(false);
    exitSelectMode();
    setBulkDeleting(false);
    fetchTotalHours();
    if (failed === 0) {
      toast.success(`Deleted ${succeeded} log${succeeded === 1 ? '' : 's'}.`);
    } else {
      toast.error(`Deleted ${succeeded}, ${failed} failed.`);
    }
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    modK: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    modN: () => navigate('/new'),
    escape: () => {
      if (selectMode) exitSelectMode();
    },
  });

  const selectedCount = selectedIds.size;
  const visibleIds = logs.map((l) => l.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function handleSaveTargetHours() {
    const hours = Number(targetInput);
    if (hours > 0) {
      setTargetHours(hours);
      setTargetHoursState(hours);
      setSettingsOpen(false);
      toast.success(`Target hours set to ${hours} hours`);
    } else {
      toast.error('Please enter a valid number greater than 0');
    }
  }

  const [exporting, setExporting] = useState(false);

  async function handleExportCsv() {
    setExporting(true);
    try {
      await exportLogsAsCsv(hasActiveFilters ? activeFilters : undefined);
      toast.success('Logs exported successfully!');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Export failed.';
      toast.error(text);
    } finally {
      setExporting(false);
    }
  }

  const progressPercent = Math.min((totalHours / targetHours) * 100, 100);
  const hoursRemaining = Math.max(targetHours - totalHours, 0);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OJT Daily Logs</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Track your progress and accumulated hours.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {selectMode ? (
            <>
              <Button variant="outline" onClick={exitSelectMode} className="flex-1 sm:flex-none">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={selectedCount === 0 || bulkDeleting}
                className="flex-1 sm:flex-none"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedCount})
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={exporting || logs.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectMode(true)}
                disabled={logs.length === 0}
                className="flex-1 sm:flex-none"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Select
              </Button>
              <Button
                asChild
                className="flex-1 sm:flex-none shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40"
              >
                <Link to="/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Entry
                  <kbd className="ml-2 hidden sm:inline-block px-1.5 py-0.5 text-xs bg-primary-foreground/20 rounded">
                    ⌘N
                  </kbd>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filter Section */}
      <Card className="border-border/50">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search logs...  (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-primary/10' : ''}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button onClick={handleApplyFilters}>Search</Button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateFilter.start}
                    onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateFilter.end}
                    onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekNumber">Week Number</Label>
                  <Input
                    id="weekNumber"
                    type="number"
                    min="1"
                    max="52"
                    placeholder="e.g. 3"
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.search && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {activeFilters.search}
                      <X className="h-3 w-3 cursor-pointer" onClick={handleClearFilters} />
                    </Badge>
                  )}
                  {activeFilters.startDate && (
                    <Badge variant="secondary" className="gap-1">
                      From: {activeFilters.startDate}
                      <X className="h-3 w-3 cursor-pointer" onClick={handleClearFilters} />
                    </Badge>
                  )}
                  {activeFilters.endDate && (
                    <Badge variant="secondary" className="gap-1">
                      To: {activeFilters.endDate}
                      <X className="h-3 w-3 cursor-pointer" onClick={handleClearFilters} />
                    </Badge>
                  )}
                  {activeFilters.weekNumber && (
                    <Badge variant="secondary" className="gap-1">
                      Week: {activeFilters.weekNumber}
                      <X className="h-3 w-3 cursor-pointer" onClick={handleClearFilters} />
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      ) : null}

      {loadError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : null}

      {hasLegacyData ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Local logs found on this browser</CardTitle>
            <CardDescription>
              Import your old local data into your signed-in Supabase account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleImportLegacyLogs} disabled={importing}>
              <Upload className="mr-2 h-4 w-4" />
              {importing ? 'Importing...' : 'Import Local Logs'}
            </Button>
            {importMessage ? (
              <p className="text-sm text-muted-foreground">{importMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 overflow-hidden relative group">
          <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Tracked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tighter text-foreground drop-shadow-sm">
              {totalHours.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Recorded hours to date</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative group">
          <div className="absolute inset-0 bg-linear-to-br from-secondary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Log Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tighter text-foreground drop-shadow-sm">
              {logs.length}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Total days documented</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden relative group border-primary/20">
        <div className="absolute inset-0 bg-linear-to-r from-green-500/10 via-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            Progress to Target
          </CardTitle>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Target Hours</DialogTitle>
                <DialogDescription>
                  Configure your OJT hour goal. The progress bar will show your completion
                  percentage.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="targetHours">Target Hours</Label>
                <Input
                  id="targetHours"
                  type="number"
                  min="1"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSaveTargetHours}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-4xl font-bold tracking-tighter text-green-600">
                {progressPercent.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hoursRemaining > 0
                  ? `${hoursRemaining.toFixed(1)} hours remaining`
                  : 'Target reached!'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {totalHours.toFixed(1)} / {targetHours} hrs
              </p>
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-green-500 to-green-400 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <WeeklySummaryCard
        weeks={weeklyBuckets}
        loading={weeklyLoading}
        error={weeklyError}
        targetHours={targetHours}
      />

      {/* Analytics Charts */}
      {!loading && logs.length > 0 && (
        <AnalyticsCharts logs={logs} totalHours={totalHours} targetHours={targetHours} />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-semibold tracking-tight">Recent Logs</h2>
          {selectMode && logs.length > 0 ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all visible logs"
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer select-none">
                {allSelected ? 'Deselect all' : 'Select all'}
              </label>
            </div>
          ) : null}
        </div>
        {loading ? (
          <Card className="border-dashed">
            <CardContent className="space-y-3 py-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center px-4 py-16 text-center border-dashed">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No logs yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2 mb-6 leading-relaxed">
              You haven't recorded any OJT logs yet. Click the button below to add your first daily
              entry and start tracking your hours.
            </p>
            <Button
              variant="outline"
              asChild
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Link to="/new">Add your first log</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {logs.map((log) => {
              const isSelected = selectedIds.has(log.id);
              const cardInner = (
                <Card
                  className={
                    selectMode
                      ? `h-full bg-linear-to-br from-card to-muted/30 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/40'
                            : 'hover:border-primary/50'
                        }`
                      : 'h-full transition-all duration-300 hover:shadow-md hover:border-primary/50 bg-linear-to-br from-card to-muted/30'
                  }
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">
                        {new Date(log.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </CardTitle>
                      {selectMode ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelected(log.id)}
                          aria-label={`Select log from ${log.date}`}
                          className="mt-1"
                        />
                      ) : null}
                    </div>
                    <CardDescription className="opacity-80">
                      Week {log.weekNumber}, Day {log.dayNumber}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm mb-4">
                      <span className="text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-md">
                        {log.timeIn} - {log.timeOut}
                      </span>
                      <span className="font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20 shadow-sm">
                        {log.totalHours.toFixed(2)} hrs
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {log.tasksAccomplished.length > 0
                        ? log.tasksAccomplished[0]
                        : 'No tasks recorded.'}
                    </p>
                  </CardContent>
                </Card>
              );

              if (selectMode) {
                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => toggleSelected(log.id)}
                    className="block text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-pressed={isSelected}
                  >
                    {cardInner}
                  </button>
                );
              }

              return (
                <Link
                  key={log.id}
                  to={`/log/${log.id}`}
                  className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                >
                  {cardInner}
                </Link>
              );
            })}
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? (
                <>Loading...</>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Load More
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} log{selectedCount === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The selected log{selectedCount === 1 ? '' : 's'} will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedCount}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
