import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Clock, FileText, Calendar, Upload } from 'lucide-react';
import { getLogs, hasLegacyLocalLogs, importLegacyLocalLogs } from '@/lib/storage';
import type { OJTLogEntry } from '@/types/log';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function Dashboard() {
    const [logs, setLogs] = useState<OJTLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [hasLegacyData, setHasLegacyData] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importMessage, setImportMessage] = useState('');

    useEffect(() => {
        let active = true;
        void getLogs()
            .then((data) => {
                if (active) {
                    setLogs(data);
                    setHasLegacyData(hasLegacyLocalLogs());
                    setLoadError('');
                }
            })
            .catch((error) => {
                const text = error instanceof Error ? error.message : 'Failed to load logs.';
                if (active) {
                    setLoadError(text);
                }
                toast.error(text);
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const totalHours = logs.reduce((sum, log) => sum + log.totalHours, 0);

    async function handleImportLegacyLogs() {
        setImporting(true);
        setImportMessage('');
        try {
            const result = await importLegacyLocalLogs();
            const refreshed = await getLogs();
            setLogs(refreshed);
            setHasLegacyData(false);
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
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
                                <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-primary/50 bg-gradient-to-br from-card to-muted/30">
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
            </div>
        </div>
    );
}
