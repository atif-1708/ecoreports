/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import Dashboard from './components/Dashboard';
import StoreManagement from './components/StoreManagement';
import EmployeeManagement from './components/EmployeeManagement';
import ReportForm from './components/ReportForm';
import Layout from './components/Layout';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { LayoutDashboard, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        } else {
          // Create default profile for new user
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: name || firebaseUser.displayName || 'New User',
            role: (firebaseUser.email === 'atifnazir1708@gmail.com' || firebaseUser.email === 'admin@admetric.com') ? 'admin' : 'employee',
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setUser(newProfile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login failed:', error);
      setAuthError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      // Profile creation is handled by onAuthStateChanged
    } catch (error: any) {
      console.error('Sign up failed:', error);
      setAuthError(error.message || 'Sign up failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
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
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                    <div className="flex flex-col gap-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} />
                        <span className="font-medium">Authentication Error</span>
                      </div>
                      <p className="text-xs opacity-90">{authError}</p>
                      {authError.includes('invalid-credential') && (
                        <p className="text-[10px] font-semibold uppercase mt-1">
                          Tip: If this is your first time, please use the "Sign Up" tab to create your account.
                        </p>
                      )}
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full gap-2" disabled={isAuthLoading}>
                    {isAuthLoading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                    Sign In
                  </Button>
                </form>
                <div className="mt-6 p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Initial Admin Access</p>
                  <p className="text-sm text-zinc-600">Email: <code className="bg-zinc-200 px-1 rounded">admin@admetric.com</code></p>
                  <p className="text-sm text-zinc-600">Password: <code className="bg-zinc-200 px-1 rounded">admin123</code></p>
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] text-zinc-400 italic">1. Enable Email/Password in Firebase Console.</p>
                    <p className="text-[10px] text-zinc-400 italic">2. Use "Sign Up" tab first to create this user.</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input 
                      id="signup-name" 
                      placeholder="John Doe" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="john@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                  
                  {authError && (
                    <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">
                      <AlertCircle size={16} />
                      <span>{authError}</span>
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full gap-2" disabled={isAuthLoading}>
                    {isAuthLoading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                    Create Account
                  </Button>
                </form>
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

