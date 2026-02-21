import { useState } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type AuthMode = 'sign-in' | 'sign-up';

export function AuthPage() {
    const [mode, setMode] = useState<AuthMode>('sign-in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isSignIn = mode === 'sign-in';

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            if (isSignIn) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) {
                    throw signInError;
                }
                toast.success('Signed in successfully.');
            } else {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) {
                    throw signUpError;
                }

                if (!data.session) {
                    setMessage('Check your email to verify your account, then sign in.');
                    toast.info('Check your email to verify your account.');
                } else {
                    toast.success('Account created successfully.');
                }
            }
        } catch (err) {
            const text = err instanceof Error ? err.message : 'Authentication failed.';
            setError(text);
            toast.error(text);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[100dvh] bg-background text-foreground antialiased flex items-center justify-center px-4 py-8">
            <main className="w-full max-w-md">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl">{isSignIn ? 'Sign In' : 'Create Account'}</CardTitle>
                        <CardDescription>
                            {isSignIn
                                ? 'Sign in to view and manage your OJT logs.'
                                : 'Create an account to securely store your OJT logs.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    minLength={6}
                                    autoComplete={isSignIn ? 'current-password' : 'new-password'}
                                />
                            </div>

                            {error ? <p className="text-sm text-destructive">{error}</p> : null}
                            {message ? <p className="text-sm text-green-600">{message}</p> : null}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : isSignIn ? (
                                    <LogIn className="mr-2 h-4 w-4" />
                                ) : (
                                    <UserPlus className="mr-2 h-4 w-4" />
                                )}
                                {isSignIn ? 'Sign In' : 'Sign Up'}
                            </Button>
                        </form>

                        <div className="mt-4 text-sm text-muted-foreground">
                            {isSignIn ? 'No account yet?' : 'Already have an account?'}{' '}
                            <button
                                type="button"
                                className="font-medium text-primary hover:underline"
                                onClick={() => {
                                    setMode(isSignIn ? 'sign-up' : 'sign-in');
                                    setError('');
                                    setMessage('');
                                }}
                            >
                                {isSignIn ? 'Sign up' : 'Sign in'}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
