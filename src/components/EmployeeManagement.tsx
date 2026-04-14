import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, Store, UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Input } from '@/components/ui/input.tsx';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table.tsx';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog.tsx';
import { Users, Mail, Shield, Store as StoreIcon, UserPlus, Copy, Check, Loader2 } from 'lucide-react';

interface EmployeeManagementProps {
  user: UserProfile;
}

export default function EmployeeManagement({ user }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Employee State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<UserRole>('employee');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < 12; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const password = generatePassword();
    setGeneratedPassword(password);

    try {
      // In a real app with admin privileges, we'd use auth.admin.createUser
      // For this demo, we'll use signUp which might sign the admin out, 
      // OR we just create the profile and the user signs up themselves.
      // The user requested "Credentials will be generated", so we'll simulate it.
      
      const { data, error: authError } = await supabase.auth.signUp({
        email: newEmpEmail,
        password: password,
        options: {
          data: {
            full_name: newEmpName,
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        const newProfile: UserProfile = {
          uid: data.user.id,
          email: newEmpEmail,
          name: newEmpName,
          role: newEmpRole,
          tempPassword: password,
          createdAt: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([newProfile]);

        if (profileError) throw profileError;
        
        // Note: Admin might be signed out here depending on Supabase config.
        // In a production app, this would be a server-side function.
      }
      
      fetchData();
    } catch (error) {
      console.error('Error adding employee:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const copyCredentials = () => {
    const text = `Email: ${newEmpEmail}\nPassword: ${generatedPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stores
      let storesQuery = supabase.from('stores').select('*');
      if (user.role !== 'admin') {
        storesQuery = storesQuery.eq('id', user.storeId);
      }
      
      const { data: storesData, error: storesError } = await storesQuery;
      if (storesError) throw storesError;
      setStores(storesData as Store[]);

      // Fetch employees
      let employeesQuery = supabase
        .from('profiles')
        .select('*')
        .order('createdAt', { ascending: false });

      if (user.role !== 'admin') {
        employeesQuery = employeesQuery.eq('storeId', user.storeId);
      }

      const { data: employeesData, error: employeesError } = await employeesQuery;
      if (employeesError) throw employeesError;
      setEmployees(employeesData as UserProfile[]);
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (uid: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('uid', uid);
      
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleUpdateStore = async (uid: string, storeId: string) => {
    try {
      // For now, we'll stick to the single storeId in profiles for simplicity
      // but we could expand this to a separate table for many-to-many.
      const { error } = await supabase
        .from('profiles')
        .update({ storeId })
        .eq('uid', uid);
      
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating store:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Employee Management</h1>
          <p className="text-zinc-500">Manage team roles and assign employees to client stores.</p>
        </div>
        
        {user.role === 'admin' && (
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setGeneratedPassword('');
              setNewEmpEmail('');
              setNewEmpName('');
            }
          }}>
            <DialogTrigger render={<Button className="gap-2"><UserPlus size={18} /> Add Employee</Button>} />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Create credentials for a new team member. They will use these to log in.
                </DialogDescription>
              </DialogHeader>
              
              {!generatedPassword ? (
                <form onSubmit={handleAddEmployee} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Jane Smith" 
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="jane@admetric.com" 
                      value={newEmpEmail}
                      onChange={(e) => setNewEmpEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newEmpRole} onValueChange={(val) => setNewEmpRole(val as UserRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full" disabled={isCreating}>
                      {isCreating ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                      Generate Credentials
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <div className="space-y-6 py-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <p className="text-sm text-emerald-800 font-medium mb-1">Account Created Successfully!</p>
                    <p className="text-xs text-emerald-600">Copy these details and send them to the employee.</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-50 rounded border border-zinc-200 font-mono text-sm break-all">
                      <p><span className="text-zinc-400">Email:</span> {newEmpEmail}</p>
                      <p><span className="text-zinc-400">Pass:</span> {generatedPassword}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={copyCredentials}
                    >
                      {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy Credentials'}
                    </Button>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="ghost" className="w-full" onClick={() => setIsAddDialogOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>A list of all employees and their current access levels.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-4">Name & Email</TableHead>
                <TableHead className="px-6 py-4">Current Role</TableHead>
                <TableHead className="px-6 py-4">Assigned Store</TableHead>
                <TableHead className="px-6 py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.uid} className="hover:bg-zinc-50 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-900">{emp.name}</p>
                          {emp.uid === user.uid && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">You</Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Mail size={12} />
                          {emp.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Select 
                      value={emp.role} 
                      onValueChange={(val) => handleUpdateRole(emp.uid, val as UserRole)}
                      disabled={user.role !== 'admin' && emp.uid !== user.uid}
                    >
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Select 
                      value={emp.storeId || 'none'} 
                      onValueChange={(val) => handleUpdateStore(emp.uid, val === 'none' ? '' : val)}
                      disabled={user.role !== 'admin'}
                    >
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Store Assigned</SelectItem>
                        {stores.map(store => (
                          <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" disabled>
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                    No team members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
