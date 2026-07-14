import type { OJTLogEntry } from '@ojt-log/shared';
import { jsPDF } from 'jspdf';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  FileDown,
  FileText,
  Lightbulb,
  Target,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteLog, getLogById } from '@/lib/storage';

export function LogDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState<OJTLogEntry | null>(null);
  const [loadingLog, setLoadingLog] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  function handleExportPDF() {
    if (!log) return;
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 54; // ~0.75 inch
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('OJT Narrative Daily Log', pageWidth / 2, y, { align: 'center' });
      y += 28;

      // Meta block
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const meta: Array<[string, string]> = [
        ['Date', log.date],
        ['Week Number', `Week ${log.weekNumber}`],
        ['Day Number', `Day ${log.dayNumber}`],
        ['Time In', log.timeIn],
        ['Time Out', log.timeOut],
        ['Total Hours for the Day', `${log.totalHours.toFixed(2)} hours`],
      ];
      for (const [label, value] of meta) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 110, y);
        y += 18;
      }

      y += 10;
      // Divider
      doc.setDrawColor(120);
      doc.line(margin, y, pageWidth - margin, y);
      y += 20;

      function drawSection(title: string, lines: string[]) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(title, margin, y);
        y += 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        if (lines.length === 0) {
          doc.text('- None', margin + 12, y);
          y += 16;
          return;
        }
        for (const line of lines) {
          const wrapped = doc.splitTextToSize(line, maxWidth - 12);
          for (const segment of wrapped) {
            if (y > pageHeight - margin) {
              doc.addPage();
              y = margin;
            }
            doc.text('•', margin, y);
            doc.text(segment, margin + 12, y);
            y += 15;
          }
        }
        y += 6;
      }

      drawSection('1. Tasks Accomplished / Activities Performed', log.tasksAccomplished);
      drawSection('2. Key Learnings / Observations', log.keyLearnings);

      // Challenges (paragraph)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      if (y > pageHeight - margin - 40) {
        doc.addPage();
        y = margin;
      }
      doc.text('3. Challenges Encountered & Actions Taken (If any)', margin, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const challengeLines = doc.splitTextToSize(log.challenges || '- None', maxWidth);
      for (const segment of challengeLines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(segment, margin, y);
        y += 15;
      }
      y += 6;

      // Goals
      if (y > pageHeight - margin - 40) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('4. Goals for Tomorrow', margin, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const goalLines = doc.splitTextToSize(log.goalsForTomorrow || '- None', maxWidth);
      for (const segment of goalLines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(segment, margin, y);
        y += 15;
      }

      doc.save(`ojt-log-${log.date}.pdf`);
      toast.success('PDF exported.');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error(err instanceof Error ? err.message : 'PDF export failed.');
    } finally {
      setExportingPdf(false);
    }
  }

  useEffect(() => {
    if (!id) return;

    let active = true;
    setLoadingLog(true);
    setLoadError('');
    void getLogById(id)
      .then((found) => {
        if (!active) return;
        if (!found) {
          setLoadError('Log entry not found.');
          return;
        }
        setLog(found);
      })
      .catch((error) => {
        if (!active) return;
        const text = error instanceof Error ? error.message : 'Failed to load log.';
        setLoadError(text);
        toast.error(text);
      })
      .finally(() => {
        if (active) {
          setLoadingLog(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

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
${log.tasksAccomplished.length > 0 ? log.tasksAccomplished.map((t: string) => `- ${t}`).join('\n') : '- None'}

### 2. Key Learnings / Observations
${log.keyLearnings.length > 0 ? log.keyLearnings.map((l: string) => `- ${l}`).join('\n') : '- None'}

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
    <div
      className="space-y-6 animate-in slide-in-from-bottom-8 duration-500"
      style={{ padding: '2px' }}
    >
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
              <span className="text-sm font-medium text-primary">
                Week {log.weekNumber}, Day {log.dayNumber}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight wrap-break-word">
              {formattedDate}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMarkdown}
            className="hidden sm:flex border-primary/20 hover:bg-primary/10 hover:text-primary"
          >
            <Download className="h-4 w-4 mr-2" /> Export MD
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMarkdown}
            className="sm:hidden border-primary/20 hover:bg-primary/10 hover:text-primary"
            aria-label="Export markdown"
          >
            <FileText className="h-4 w-4 mr-1" />
            MD
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exportingPdf || !log}
            className="hidden sm:flex border-primary/20 hover:bg-primary/10 hover:text-primary"
          >
            <Download className="h-4 w-4 mr-2" /> {exportingPdf ? 'Generating...' : 'Export PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exportingPdf || !log}
            className="sm:hidden border-primary/20 hover:bg-primary/10 hover:text-primary"
            aria-label="Export PDF"
          >
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

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="hidden sm:flex">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="sm:hidden"
                aria-label="Delete log"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this log entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The selected OJT log will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              {log.tasksAccomplished.map((task) => (
                <li key={task} className="flex gap-3 text-sm sm:text-base">
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
              {log.keyLearnings.map((learning) => (
                <li key={learning} className="flex gap-3 text-sm sm:text-base">
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
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {log.challenges}
                  </p>
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
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {log.goalsForTomorrow}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
