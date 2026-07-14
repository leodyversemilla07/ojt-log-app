import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, History, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  clearDraft,
  type DraftValue,
  loadDraft,
  useDraftAutosave,
} from '@/hooks/use-draft-autosave';
import { getLogById, saveLog, updateLog } from '@/lib/storage';

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  weekNumber: z.number().min(1, 'Week number must be at least 1'),
  dayNumber: z.number().min(1, 'Day number must be at least 1'),
  timeIn: z.string().min(1, 'Time In is required'),
  timeOut: z.string().min(1, 'Time Out is required'),
  tasksAccomplished: z.string().min(5, 'Please provide at least one task you accomplished'),
  keyLearnings: z.string().min(5, 'Please provide your key learnings'),
  challenges: z.string().optional(),
  goalsForTomorrow: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function LogEntryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [loadingLog, setLoadingLog] = useState(isEditing);
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      weekNumber: 1,
      dayNumber: 1,
      timeIn: '08:00',
      timeOut: '17:00',
      tasksAccomplished: '',
      keyLearnings: '',
      challenges: '',
      goalsForTomorrow: '',
    },
  });

  // Draft autosave — only enabled for new entries (not editing existing log)
  const draftId = isEditing ? `edit_${id}` : 'new';
  const draftValues = form.watch() as DraftValue;

  const { restored: draftPendingRestore, discard: discardDraft } = useDraftAutosave<FormValues>({
    draftId,
    values: draftValues,
    shouldSave: (v) => {
      // Don't save if user hasn't typed anything beyond defaults
      const tasksTrimmed = (v.tasksAccomplished || '').trim();
      const learningsTrimmed = (v.keyLearnings || '').trim();
      const challengesTrimmed = (v.challenges || '').trim();
      const goalsTrimmed = (v.goalsForTomorrow || '').trim();
      return (
        tasksTrimmed.length >= 5 ||
        learningsTrimmed.length >= 5 ||
        challengesTrimmed.length > 0 ||
        goalsTrimmed.length > 0
      );
    },
  });

  // Restore draft once on mount (for new entries only)
  useEffect(() => {
    if (isEditing) return;
    if (!draftPendingRestore) return;
    const draft = loadDraft<FormValues>(draftId);
    if (!draft) return;
    form.reset({
      date: draft.date || new Date().toISOString().split('T')[0],
      weekNumber: draft.weekNumber || 1,
      dayNumber: draft.dayNumber || 1,
      timeIn: draft.timeIn || '08:00',
      timeOut: draft.timeOut || '17:00',
      tasksAccomplished: draft.tasksAccomplished || '',
      keyLearnings: draft.keyLearnings || '',
      challenges: draft.challenges || '',
      goalsForTomorrow: draft.goalsForTomorrow || '',
    });
    setDraftRestoredAt(Date.now());
    toast.info('Draft restored.');
  }, [draftPendingRestore, isEditing, form, draftId]);

  // Warn before leaving with unsaved changes
  const isDirty = form.formState.isDirty;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !saving && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setPendingNavigation(() => blocker.proceed);
      setShowUnsavedWarning(true);
    }
  }, [blocker]);

  // Warn before browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !saving) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saving]);

  useEffect(() => {
    if (isEditing && id) {
      let active = true;
      setLoadingLog(true);
      void getLogById(id)
        .then((existing) => {
          if (!active) return;
          if (existing) {
            form.reset({
              date: existing.date,
              weekNumber: existing.weekNumber,
              dayNumber: existing.dayNumber,
              timeIn: existing.timeIn,
              timeOut: existing.timeOut,
              tasksAccomplished: existing.tasksAccomplished.join('\n'),
              keyLearnings: existing.keyLearnings.join('\n'),
              challenges: existing.challenges,
              goalsForTomorrow: existing.goalsForTomorrow,
            });
          } else {
            navigate('/');
          }
        })
        .catch((error) => {
          if (!active) return;
          const text = error instanceof Error ? error.message : 'Failed to load log.';
          setSubmitError(text);
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
    }
  }, [id, isEditing, form, navigate]);

  async function onSubmit(values: FormValues) {
    setSubmitError('');
    setSaving(true);
    const logData = {
      ...values,
      // Convert multi-line strings into arrays for structured saving
      tasksAccomplished: values.tasksAccomplished.split('\n').filter((t) => t.trim() !== ''),
      keyLearnings: values.keyLearnings.split('\n').filter((t) => t.trim() !== ''),
      challenges: values.challenges || '',
      goalsForTomorrow: values.goalsForTomorrow || '',
    };

    try {
      if (isEditing && id) {
        await updateLog(id, logData);
        toast.success('Log updated successfully.');
      } else {
        await saveLog(logData);
        clearDraft(draftId);
        toast.success('Log saved successfully.');
      }
      navigate('/');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Failed to save log.';
      setSubmitError(text);
      toast.error(text);
    } finally {
      setSaving(false);
    }
  }

  function handleDiscardDraft() {
    discardDraft();
    form.reset({
      date: new Date().toISOString().split('T')[0],
      weekNumber: 1,
      dayNumber: 1,
      timeIn: '08:00',
      timeOut: '17:00',
      tasksAccomplished: '',
      keyLearnings: '',
      challenges: '',
      goalsForTomorrow: '',
    });
    setDraftRestoredAt(null);
    toast.success('Draft discarded.');
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Log Entry' : 'New Log Entry'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Document your daily OJT activities and learnings.
          </p>
        </div>
        {!isEditing && draftRestoredAt ? (
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs">
            <History className="size-3.5 text-primary" />
            <span className="text-primary font-medium">Draft restored</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscardDraft}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1 size-3" />
              Discard
            </Button>
          </div>
        ) : null}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {loadingLog ? (
            <Card className="border-dashed">
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ) : null}
          {submitError ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-4 text-sm text-destructive">{submitError}</CardContent>
            </Card>
          ) : null}
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
              <CardDescription>When did this training occur?</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weekNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Week Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dayNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time In</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Out</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Narrative Report</CardTitle>
              <CardDescription>What did you accomplish today?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="tasksAccomplished"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasks Accomplished</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g. Fixed bugs in the login module... (Tip: Use a new line for each task)"
                        className="min-h-30 resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Separate each task with a new line.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keyLearnings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Learnings / Observations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g. Learned how to implement Zod validation..."
                        className="min-h-25 resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Separate each point with a new line.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="challenges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challenges Encountered (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g. Struggled with adjusting the database schema..."
                        className="min-h-20 resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="goalsForTomorrow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goals for Tomorrow (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g. Will focus on completing the dashboard UI..."
                        className="min-h-20 resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 py-4">
            <Button variant="outline" asChild type="button" disabled={saving}>
              <Link to="/">Cancel</Link>
            </Button>
            <Button
              type="submit"
              className="min-w-30 shadow-md shadow-primary/20"
              disabled={saving || loadingLog}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Log'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowUnsavedWarning(false);
                setPendingNavigation(null);
                blocker.reset?.();
              }}
            >
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedWarning(false);
                pendingNavigation?.();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
