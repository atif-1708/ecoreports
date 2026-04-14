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
import { LayoutDashboard, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
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
    const fetchProfile = async (userId: string, userEmail?: string, userName?: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('uid', userId)
        .single();

      if (error) {
        // PGRST116 means "no rows found"
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
    };

    const setupAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await fetchProfile(
          session.user.id, 
          session.user.email, 
          session.user.user_metadata?.full_name
        );
        
        // Force admin role for the primary admin email if it's not set
        if (profile && (session.user.email === 'atifnazir1708@gmail.com' || session.user.email === 'admin@admetric.com') && profile.role !== 'admin') {
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('uid', session.user.id)
            .select()
            .single();
          
          if (updatedProfile) {
            setUser(updatedProfile as UserProfile);
          } else {
            setUser(profile);
          }
        } else {
          setUser(profile);
        }
      }
      setLoading(false);
    };

    setupAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const profile = await fetchProfile(
          session.user.id, 
          session.user.email, 
          session.user.user_metadata?.full_name
        );
        setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
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
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-900 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg">
          <LayoutDashboard size={32} />
        </div>
        
        <Card className="w-full max-w-md border-none shadow-xl bg-white">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-zinc-900">AdMetric SaaS</CardTitle>
            <CardDescription>
              Sign in to manage your agency's campaign performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input 
                      id="login-email" 
                      type="email" 
                      placeholder="admin@admetric.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input 
                      id="login-password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                  
                  {authError && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Authentication Error</AlertTitle>
                      <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button type="submit" className="w-full gap-2" disabled={isAuthLoading}>
                    {isAuthLoading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                    Sign In
                  </Button>
                </form>
                <div className="mt-6 p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Supabase Migration</p>
                  <p className="text-sm text-zinc-600">Please ensure your Supabase project is configured with the following tables:</p>
                  <ul className="text-xs text-zinc-500 mt-2 list-disc list-inside space-y-1">
                    <li>profiles (uid, email, name, role, storeId, createdAt)</li>
                    <li>stores (id, name, ownerId, createdAt)</li>
                    <li>store_assignments (id, employeeId, storeId, createdAt)</li>
                    <li>reports (id, storeId, employeeId, employeeName, ...)</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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

