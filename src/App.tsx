import { Suspense, lazy, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LogOut, Settings } from 'lucide-react';
import { Routes, Route } from 'react-router-dom';
import { supabase } from '@/utils/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
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
import { getTargetHours, setTargetHours } from '@/lib/storage';
import { toast } from 'sonner';

const AuthPage = lazy(() =>
  import('./pages/auth').then((module) => ({ default: module.AuthPage }))
);
const Dashboard = lazy(() =>
  import('./pages/dashboard').then((module) => ({ default: module.Dashboard }))
);
const LogEntryForm = lazy(() =>
  import('./pages/log-entry-form').then((module) => ({ default: module.LogEntryForm }))
);
const LogDetailView = lazy(() =>
  import('./pages/log-detail-view').then((module) => ({ default: module.LogDetailView }))
);

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetInput, setTargetInput] = useState(() => getTargetHours().toString());

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoadingSession(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadingSession(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loadingSession) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-dashed">
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <Suspense
        fallback={(
          <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-4">
            <Card className="w-full max-w-md border-dashed">
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          </div>
        )}
      >
        <AuthPage />
      </Suspense>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function handleSaveTargetHours() {
    const hours = Number(targetInput);
    if (hours > 0) {
      setTargetHours(hours);
      setSettingsOpen(false);
      toast.success(`Target hours set to ${hours} hours`);
    } else {
      toast.error('Please enter a valid number greater than 0');
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground antialiased selection:bg-primary/10">
      <Toaster richColors />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 no-print rounded-xl border bg-card/70 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">OJT Daily Logs</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
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
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
        <Suspense
          fallback={(
            <Card className="border-dashed">
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          )}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<LogEntryForm />} />
            <Route path="/edit/:id" element={<LogEntryForm />} />
            <Route path="/log/:id" element={<LogDetailView />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
