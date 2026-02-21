import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Edit, Trash2, Calendar, Clock, CheckCircle2, Lightbulb, AlertTriangle, Target, Download, FileText, FileDown } from 'lucide-react';

import { getLogById, deleteLog } from '@/lib/storage';
import type { OJTLogEntry } from '@/types/log';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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

export function LogDetailView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [log, setLog] = useState<OJTLogEntry | null>(null);
    const [loadingLog, setLoadingLog] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const printTemplateRef = useRef<HTMLDivElement>(null);

    const handleExportPDF = useReactToPrint({
        contentRef: printTemplateRef,
        documentTitle: log ? `ojt-log-${log.date}` : 'ojt-log',
    });

    useEffect(() => {
        if (!id) return;

        let active = true;
        setLoadingLog(true);
        setLoadError('');
        void getLogById(id).then((found) => {
            if (!active) return;
            if (!found) {
                setLoadError('Log entry not found.');
                return;
            }
            setLog(found);
        }).catch((error) => {
            if (!active) return;
            const text = error instanceof Error ? error.message : 'Failed to load log.';
            setLoadError(text);
            toast.error(text);
        }).finally(() => {
            if (active) {
                setLoadingLog(false);
            }
        });

        return () => {
            active = false;
        };
    }, [id, navigate]);

    const handleDelete = async () => {
        if (!id) return;
        setDeleting(true);
        setDeleteError('');
        try {
            await deleteLog(id);
            toast.success('Log deleted successfully.');
            navigate('/');
        } catch (error) {
            const text = error instanceof Error ? error.message : 'Failed to delete log.';
            setDeleteError(text);
            toast.error(text);
        } finally {
            setDeleting(false);
        }
    };

    const handleExportMarkdown = () => {
        if (!log) return;

        const content = `# OJT Narrative Daily Log

**Date:** ${log.date}
**Week Number:** Week ${log.weekNumber}
**Day Number:** Day ${log.dayNumber}

**Time In:** ${log.timeIn}
**Time Out:** ${log.timeOut}
**Total Hours for the Day:** ${log.totalHours.toFixed(2)} hours

---

## Daily Narrative

### 1. Tasks Accomplished / Activities Performed
${log.tasksAccomplished.length > 0 ? log.tasksAccomplished.map((t: string) => '- ' + t).join('\n') : '- None'}

### 2. Key Learnings / Observations
${log.keyLearnings.length > 0 ? log.keyLearnings.map((l: string) => '- ' + l).join('\n') : '- None'}

### 3. Challenges Encountered & Actions Taken (If any)
${log.challenges || '- None'}

### 4. Goals for Tomorrow
${log.goalsForTomorrow || '- None'}
`;

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', `ojt-log-${log.date}.md`);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    if (loadingLog) {
        return (
            <div className="space-y-4">
                <Card className="border-dashed">
                    <CardContent className="space-y-3 py-6">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!log) {
        return (
            <div className="space-y-4">
                <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="py-6 text-sm text-destructive">
                        {loadError || 'Unable to display this log entry.'}
                    </CardContent>
                </Card>
                <Button variant="outline" asChild>
                    <Link to="/">Back to Dashboard</Link>
                </Button>
            </div>
        );
    }

    const formattedDate = new Date(log.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500" style={{ padding: '2px' }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                    <Button variant="ghost" size="icon" asChild className="rounded-full no-print">
                        <Link to="/">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">Week {log.weekNumber}, Day {log.dayNumber}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{formattedDate}</h1>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 no-print sm:justify-end">
                    <Button variant="outline" size="sm" onClick={handleExportMarkdown} className="hidden sm:flex border-primary/20 hover:bg-primary/10 hover:text-primary">
                        <Download className="h-4 w-4 mr-2" /> Export MD
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportMarkdown} className="sm:hidden border-primary/20 hover:bg-primary/10 hover:text-primary" aria-label="Export markdown">
                        <FileText className="h-4 w-4 mr-1" />
                        MD
                    </Button>

                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="hidden sm:flex border-primary/20 hover:bg-primary/10 hover:text-primary">
                        <Download className="h-4 w-4 mr-2" /> Export PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="sm:hidden border-primary/20 hover:bg-primary/10 hover:text-primary" aria-label="Export PDF">
                        <FileDown className="h-4 w-4 mr-1" />
                        PDF
                    </Button>

                    <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                        <Link to={`/edit/${log.id}`}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                        </Link>
                    </Button>
                    <Button variant="outline" size="icon" asChild className="sm:hidden">
                        <Link to={`/edit/${log.id}`}>
                            <Edit className="h-4 w-4" />
                        </Link>
                    </Button>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="hidden sm:flex">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                        </DialogTrigger>
                        <DialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="sm:hidden" aria-label="Delete log">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete this log entry?</DialogTitle>
                                <DialogDescription>
                                    This action cannot be undone. The selected OJT log will be permanently removed.
                                </DialogDescription>
                            </DialogHeader>
                            {deleteError ? (
                                <p className="text-sm text-destructive">{deleteError}</p>
                            ) : null}
                            <DialogFooter>
                                <DialogClose asChild disabled={deleting}>
                                    <Button variant="outline" disabled={deleting}>Cancel</Button>
                                </DialogClose>
                                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6">
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="h-5 w-5 text-primary" />
                            Time Log
                        </CardTitle>
                        <CardDescription>Hours rendered for this day</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="grid grid-cols-2 sm:flex sm:gap-12 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Time In</p>
                                    <p className="font-semibold text-lg">{log.timeIn}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Time Out</p>
                                    <p className="font-semibold text-lg">{log.timeOut}</p>
                                </div>
                            </div>
                            <div className="bg-primary/10 border border-primary/20 rounded-lg px-6 py-4 text-center sm:text-right">
                                <p className="text-sm text-primary font-medium mb-1">Total Hours</p>
                                <p className="text-3xl font-bold text-primary">{log.totalHours.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50" />
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            Tasks Accomplished
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {log.tasksAccomplished.map((task, idx) => (
                                <li key={idx} className="flex gap-3 text-sm sm:text-base">
                                    <span className="text-muted-foreground/50 mt-1">•</span>
                                    <span className="leading-relaxed">{task}</span>
                                </li>
                            ))}
                            {log.tasksAccomplished.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No tasks recorded.</p>
                            )}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Lightbulb className="h-5 w-5 text-blue-500" />
                            Key Learnings / Observations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {log.keyLearnings.map((learning, idx) => (
                                <li key={idx} className="flex gap-3 text-sm sm:text-base">
                                    <span className="text-muted-foreground/50 mt-1">•</span>
                                    <span className="leading-relaxed">{learning}</span>
                                </li>
                            ))}
                            {log.keyLearnings.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No learnings recorded.</p>
                            )}
                        </ul>
                    </CardContent>
                </Card>

                {(log.challenges || log.goalsForTomorrow) && (
                    <div className="grid sm:grid-cols-2 gap-6">
                        {log.challenges && (
                            <Card className="border-border/50 shadow-sm relative overflow-hidden h-full">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                                        Challenges Encountered
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{log.challenges}</p>
                                </CardContent>
                            </Card>
                        )}

                        {log.goalsForTomorrow && (
                            <Card className="border-border/50 shadow-sm relative overflow-hidden h-full">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50" />
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Target className="h-5 w-5 text-purple-500" />
                                        Goals for Tomorrow
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{log.goalsForTomorrow}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            <div ref={printTemplateRef} className="hidden print:block bg-white text-black p-10 text-[12pt] leading-relaxed">
                <h1 className="text-2xl font-bold text-center mb-8">OJT Narrative Daily Log</h1>

                <div className="space-y-1 mb-6">
                    <p><span className="font-semibold">Date:</span> {log.date}</p>
                    <p><span className="font-semibold">Week Number:</span> Week {log.weekNumber}</p>
                    <p><span className="font-semibold">Day Number:</span> Day {log.dayNumber}</p>
                    <p><span className="font-semibold">Time In:</span> {log.timeIn}</p>
                    <p><span className="font-semibold">Time Out:</span> {log.timeOut}</p>
                    <p><span className="font-semibold">Total Hours for the Day:</span> {log.totalHours.toFixed(2)} hours</p>
                </div>

                <hr className="border-black my-6" />

                <section className="mb-6">
                    <h2 className="font-semibold mb-2">1. Tasks Accomplished / Activities Performed</h2>
                    {log.tasksAccomplished.length > 0 ? (
                        <ul className="list-disc pl-6 space-y-1">
                            {log.tasksAccomplished.map((task, idx) => (
                                <li key={`print-task-${idx}`}>{task}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>- None</p>
                    )}
                </section>

                <section className="mb-6">
                    <h2 className="font-semibold mb-2">2. Key Learnings / Observations</h2>
                    {log.keyLearnings.length > 0 ? (
                        <ul className="list-disc pl-6 space-y-1">
                            {log.keyLearnings.map((learning, idx) => (
                                <li key={`print-learning-${idx}`}>{learning}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>- None</p>
                    )}
                </section>

                <section className="mb-6">
                    <h2 className="font-semibold mb-2">3. Challenges Encountered & Actions Taken (If any)</h2>
                    <p className="whitespace-pre-wrap">{log.challenges || '- None'}</p>
                </section>

                <section className="mb-8">
                    <h2 className="font-semibold mb-2">4. Goals for Tomorrow</h2>
                    <p className="whitespace-pre-wrap">{log.goalsForTomorrow || '- None'}</p>
                </section>

            </div>
        </div>
    );
}
