import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Clock, FileText, Calendar, Upload, ChevronDown, Target, Settings } from 'lucide-react';
import { getLogs, hasLegacyLocalLogs, importLegacyLocalLogs, getTotalHoursLogged, getTargetHours, setTargetHours } from '@/lib/storage';
import type { OJTLogEntry } from '@/types/log';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function Dashboard() {
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

    const fetchLogs = useCallback(async (pageNum: number, isInitial = false) => {
        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        try {
            const result = await getLogs(pageNum);
            if (isInitial) {
                setLogs(result.logs);
            } else {
                setLogs(prev => [...prev, ...result.logs]);
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
    }, []);

    const fetchTotalHours = useCallback(async () => {
        try {
            const hours = await getTotalHoursLogged();
            setTotalHours(hours);
        } catch (error) {
            console.error('Failed to fetch total hours', error);
        }
    }, []);

    useEffect(() => {
        let active = true;
        fetchLogs(0, true).then(() => {
            if (active) fetchTotalHours();
        });
        return () => { active = false; };
    }, [fetchLogs, fetchTotalHours]);

    function handleLoadMore() {
        fetchLogs(page + 1);
    }

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

    const progressPercent = Math.min((totalHours / targetHours) * 100, 100);
    const hoursRemaining = Math.max(targetHours - totalHours, 0);

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">OJT Daily Logs</h1>
                    <p className="text-muted-foreground text-sm sm:text-base mt-1">Track your progress and accumulated hours.</p>
                </div>
                <Button asChild className="w-full sm:w-auto shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40">
                    <Link to="/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Entry
                    </Link>
                </Button>
            </div>

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
                    <CardContent className="py-4 text-sm text-destructive">
                        {loadError}
                    </CardContent>
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
                        <div className="text-5xl font-bold tracking-tighter text-foreground drop-shadow-sm">{totalHours.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-2 font-medium">
                            Recorded hours to date
                        </p>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden relative group">
                    <div className="absolute inset-0 bg-linear-to-br from-secondary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Log Entries</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-bold tracking-tighter text-foreground drop-shadow-sm">{logs.length}</div>
                        <p className="text-xs text-muted-foreground mt-2 font-medium">
                            Total days documented
                        </p>
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
                                    Configure your OJT hour goal. The progress bar will show your completion percentage.
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
                            <div className="text-4xl font-bold tracking-tighter text-green-600">{progressPercent.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {hoursRemaining > 0 ? `${hoursRemaining.toFixed(1)} hours remaining` : 'Target reached!'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium">{totalHours.toFixed(1)} / {targetHours} hrs</p>
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

            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Recent Logs</h2>
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
                            You haven't recorded any OJT logs yet. Click the button below to add your first daily entry and start tracking your hours.
                        </p>
                        <Button variant="outline" asChild className="hover:bg-primary hover:text-primary-foreground transition-colors">
                            <Link to="/new">Add your first log</Link>
                        </Button>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {logs.map((log) => (
                            <Link key={log.id} to={`/log/${log.id}`} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
                                <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-primary/50 bg-linear-to-br from-card to-muted/30">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">
                                            {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </CardTitle>
                                        <CardDescription className="opacity-80">
                                            Week {log.weekNumber}, Day {log.dayNumber}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-center text-sm mb-4">
                                            <span className="text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-md">{log.timeIn} - {log.timeOut}</span>
                                            <span className="font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20 shadow-sm">
                                                {log.totalHours.toFixed(2)} hrs
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                            {log.tasksAccomplished.length > 0 ? log.tasksAccomplished[0] : "No tasks recorded."}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
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
        </div>
    );
}
