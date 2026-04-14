/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import Dashboard from '@/components/Dashboard';
import StoreManagement from '@/components/StoreManagement';
import EmployeeManagement from '@/components/EmployeeManagement';
import ReportForm from '@/components/ReportForm';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { 
  LayoutDashboard, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async (userId: string, userEmail?: string, userName?: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('uid', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116' && userEmail) {
            console.log('Profile not found for authenticated user, creating one...');
            const newProfile: UserProfile = {
              uid: userId,
              email: userEmail,
              name: userName || 'User',
              role: (userEmail === 'atifnazir1708@gmail.com' || userEmail === 'admin@admetric.com') ? 'admin' : 'employee',
              createdAt: new Date().toISOString(),
            };

            const { data: createdData, error: insertError } = await supabase
              .from('profiles')
              .insert([newProfile])
              .select()
              .single();

            if (insertError) {
              console.error('Error auto-creating profile:', insertError);
              return null;
            }
            return createdData as UserProfile;
          }
          console.error('Error fetching profile:', error);
          return null;
        }
        return data as UserProfile;
      } catch (err) {
        console.error('Unexpected error in fetchProfile:', err);
        return null;
      }
    };

    const handleAuthChange = async (session: any) => {
      if (!isMounted) return;
      
      if (session?.user) {
        const profile = await fetchProfile(
          session.user.id, 
          session.user.email, 
          session.user.user_metadata?.full_name
        );
        
        if (profile && isMounted) {
          // Force admin role for the primary admin email if it's not set
          if ((session.user.email === 'atifnazir1708@gmail.com' || session.user.email === 'admin@admetric.com') && profile.role !== 'admin') {
            const { data: updatedProfile } = await supabase
              .from('profiles')
              .update({ role: 'admin' })
              .eq('uid', session.user.id)
              .select()
              .single();
            
            if (updatedProfile && isMounted) {
              setUser(updatedProfile as UserProfile);
            } else if (isMounted) {
              setUser(profile);
            }
          } else {
            setUser(profile);
          }
        }
      } else if (isMounted) {
        setUser(null);
      }
      
      if (isMounted) setLoading(false);
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    }).catch(err => {
      console.error('Error getting session:', err);
      if (isMounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        handleAuthChange(session);
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    // Safety timeout for loading state
    const timeout = setTimeout(() => {
      if (loading && isMounted) {
        console.warn('Auth loading timed out, forcing loading to false');
        setLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Login failed:', error);
      let message = error.message || 'Login failed. Please check your credentials.';
      if (message.includes('rate limit')) {
        message = 'Too many login attempts. Please wait a few minutes and try again.';
      } else if (message.includes('Email not confirmed')) {
        message = 'Your email is not confirmed. Please check your inbox for a confirmation link or disable "Confirm Email" in your Supabase Auth settings.';
      }
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });
      
      if (error) throw error;

      if (data.user) {
        // Create profile in Supabase
        const newProfile: UserProfile = {
          uid: data.user.id,
          email: data.user.email || '',
          name: name || 'New User',
          role: (data.user.email === 'atifnazir1708@gmail.com' || data.user.email === 'admin@admetric.com') ? 'admin' : 'employee',
          createdAt: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([newProfile]);

        if (profileError) throw profileError;
        setUser(newProfile);
      }
    } catch (error: any) {
      console.error('Sign up failed:', error);
      let message = error.message || 'Sign up failed. Please try again.';
      if (message.includes('rate limit')) {
        message = 'Too many sign up attempts. Please wait a few minutes and try again.';
      } else if (message.includes('Email not confirmed')) {
        message = 'Account created! Please check your email to confirm your account before logging in.';
      }
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-50 gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-900 border-t-transparent"></div>
        <p className="text-sm text-zinc-500 animate-pulse">Initializing AdMetric...</p>
        <Button 
          variant="ghost" 
          size="sm" 
          className="mt-4 text-zinc-400"
          onClick={() => {
            supabase.auth.signOut();
            window.location.reload();
          }}
        >
          Stuck? Reset Session
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-zinc-50">
        {/* Left Side - Visual */}
        <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 relative overflow-hidden items-center justify-center p-20">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-transparent"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-500/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full"></div>
          
          <div className="relative z-10 space-y-12 max-w-xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500 text-white shadow-2xl shadow-brand-500/20">
              <LayoutDashboard size={40} />
            </div>
            <div className="space-y-6">
              <h1 className="text-7xl font-black text-white tracking-tighter leading-[0.9]">
                Performance <br />
                <span className="text-brand-400">Intelligence.</span>
              </h1>
              <p className="text-zinc-400 text-xl font-medium leading-relaxed">
                The ultimate command center for modern digital agencies. Track, analyze, and optimize your campaign performance with AI-driven insights.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-3xl font-black text-white tracking-tighter">99.9%</p>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Data Accuracy</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-white tracking-tighter">24/7</p>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Real-time Sync</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-20">
          <div className="w-full max-w-md space-y-12">
            <div className="space-y-4">
              <div className="lg:hidden flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg mb-8">
                <LayoutDashboard size={24} />
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-zinc-900">Welcome Back</h2>
              <p className="text-zinc-500 font-medium text-lg">Enter your credentials to access your dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="login-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Email Address</Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    placeholder="admin@admetric.com" 
                    className="h-14 rounded-2xl border-zinc-200 bg-white focus:ring-brand-500 font-bold text-lg px-6"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Password</Label>
                    <button type="button" className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 hover:text-brand-700">Forgot Password?</button>
                  </div>
                  <Input 
                    id="login-password" 
                    type="password" 
                    placeholder="••••••••"
                    className="h-14 rounded-2xl border-zinc-200 bg-white focus:ring-brand-500 font-bold text-lg px-6"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
              </div>

              {authError && (
                <Alert variant="destructive" className="rounded-3xl border-none bg-rose-50 text-rose-900 p-6 shadow-lg shadow-rose-500/10">
                  <AlertCircle className="h-6 w-6 text-rose-600" />
                  <div className="ml-2">
                    <AlertTitle className="font-black text-lg">Authentication Error</AlertTitle>
                    <AlertDescription className="font-medium opacity-80">{authError}</AlertDescription>
                  </div>
                </Alert>
              )}

              <Button type="submit" className="w-full h-16 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-lg font-black shadow-2xl shadow-zinc-900/20 transition-all active:scale-[0.98] gap-3" disabled={isAuthLoading}>
                {isAuthLoading ? <Loader2 className="animate-spin" size={24} /> : <LogIn size={24} />}
                Sign In to AdMetric
              </Button>
            </form>

            <div className="pt-12 border-t border-zinc-100">
              <div className="flex items-center gap-4 p-6 bg-zinc-50 rounded-[32px] border border-zinc-100">
                <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-zinc-400 shadow-sm">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-zinc-900 uppercase tracking-widest">System Status</p>
                  <p className="text-sm text-zinc-500 font-medium">All systems operational. Data sync active.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'stores':
        return <StoreManagement user={user} />;
      case 'employees':
        return <EmployeeManagement user={user} />;
      case 'reports':
        return <ReportForm user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <Layout 
      user={user} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}

