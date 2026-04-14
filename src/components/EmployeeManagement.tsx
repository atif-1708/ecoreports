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
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog.tsx';
import { 
  Users, 
  Mail, 
  Shield, 
  Store as StoreIcon, 
  UserPlus, 
  Copy, 
  Check, 
  Loader2,
  ChevronDown,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { 
  Popover as PopoverUI, 
  PopoverContent as PopoverContentUI, 
  PopoverTrigger as PopoverTriggerUI 
} from '@/components/ui/popover.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { StoreAssignment } from '@/types';

interface EmployeeManagementProps {
  user: UserProfile;
}

export default function EmployeeManagement({ user }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [assignments, setAssignments] = useState<StoreAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  
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
    setTableError(null);
    try {
      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true });
      
      if (storesError) throw storesError;
      setStores(storesData as Store[]);

      // Fetch all assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('store_assignments')
        .select('*');
      
      if (assignmentsError) {
        console.warn('Store assignments table might not exist yet:', assignmentsError);
        if (assignmentsError.message.includes('does not exist')) {
          setTableError("The 'store_assignments' table is missing in your database. Please create it to enable multi-store access.");
        }
      } else {
        setAssignments(assignmentsData as StoreAssignment[]);
      }

      // Fetch employees
      let employeesQuery = supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      // If not admin, only show employees assigned to the same stores
      if (user.role !== 'admin') {
        // This is a bit complex for a single query, so we'll fetch all and filter client-side 
        // OR we just show everyone if they are a manager. 
        // For now, let's keep it simple for admins.
      }

      const { data: employeesData, error: employeesError } = await employeesQuery;
      if (employeesError) throw employeesError;
      
      console.log('Fetched employees:', employeesData);
      setEmployees(employeesData as UserProfile[]);
    } catch (error) {
      console.error('Error fetching employee management data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAssignment = async (employeeId: string, storeId: string, isAssigned: boolean) => {
    try {
      console.log(`Toggling assignment: emp=${employeeId}, store=${storeId}, currentlyAssigned=${isAssigned}`);
      if (isAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from('store_assignments')
          .delete()
          .eq('employeeId', employeeId)
          .eq('storeId', storeId);
        if (error) {
          console.error('Error removing assignment:', error);
          alert(`Failed to remove assignment: ${error.message}`);
          throw error;
        }
      } else {
        // Add assignment
        const { error } = await supabase
          .from('store_assignments')
          .insert([{
            employeeId,
            storeId,
            createdAt: new Date().toISOString()
          }]);
        if (error) {
          console.error('Error adding assignment:', error);
          alert(`Failed to add assignment: ${error.message}. Make sure the 'store_assignments' table exists.`);
          throw error;
        }
      }
      // Optimistically update local state or just re-fetch
      await fetchData();
    } catch (error) {
      console.error('Error toggling store assignment:', error);
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
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-[10px] uppercase tracking-[0.2em]">
            <Users size={14} />
            <span>Team Administration</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900">Employee Management</h1>
          <p className="text-zinc-500 max-w-2xl text-lg font-medium">Manage team roles and assign employees to client stores.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-2xl h-12 w-12 border-zinc-200 bg-white hover:bg-zinc-50 transition-all"
            onClick={() => fetchData()} 
            disabled={loading}
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </Button>
          
          {user.role === 'admin' && (
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setGeneratedPassword('');
                setNewEmpEmail('');
                setNewEmpName('');
              }
            }}>
              <DialogTrigger asChild>
                <Button className="h-12 px-8 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/20 gap-2 font-bold">
                  <UserPlus size={20} /> Add New Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-8 bg-zinc-950 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight text-white">Add Team Member</DialogTitle>
                    <DialogDescription className="text-zinc-400 font-medium">
                      Create secure credentials for a new team member.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                
                <div className="p-8 bg-white">
                  {!generatedPassword ? (
                    <form onSubmit={handleAddEmployee} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Full Name</Label>
                        <Input 
                          id="name" 
                          placeholder="Jane Smith" 
                          className="h-12 rounded-xl border-zinc-200 bg-zinc-50 focus:ring-brand-500"
                          value={newEmpName}
                          onChange={(e) => setNewEmpName(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email Address</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="jane@admetric.com" 
                          className="h-12 rounded-xl border-zinc-200 bg-zinc-50 focus:ring-brand-500"
                          value={newEmpEmail}
                          onChange={(e) => setNewEmpEmail(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Access Level</Label>
                        <Select value={newEmpRole} onValueChange={(val) => setNewEmpRole(val as UserRole)}>
                          <SelectTrigger className="h-12 rounded-xl border-zinc-200 bg-zinc-50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-zinc-200">
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter className="pt-4">
                        <Button type="submit" className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-lg shadow-brand-500/20" disabled={isCreating}>
                          {isCreating ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                          Generate Secure Credentials
                        </Button>
                      </DialogFooter>
                    </form>
                  ) : (
                    <div className="space-y-8">
                      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4">
                        <div className="p-2 bg-emerald-500 text-white rounded-lg">
                          <Check size={20} />
                        </div>
                        <div>
                          <p className="text-sm text-emerald-900 font-bold">Account Provisioned</p>
                          <p className="text-xs text-emerald-700 font-medium mt-1">Copy these details and send them securely to the employee.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 font-mono text-sm relative group">
                          <div className="space-y-2">
                            <p className="flex items-center gap-3">
                              <span className="text-zinc-500 w-12 font-sans text-[10px] uppercase font-black tracking-widest">Email</span>
                              <span className="text-white font-bold">{newEmpEmail}</span>
                            </p>
                            <p className="flex items-center gap-3">
                              <span className="text-zinc-500 w-12 font-sans text-[10px] uppercase font-black tracking-widest">Pass</span>
                              <span className="text-brand-400 font-bold">{generatedPassword}</span>
                            </p>
                          </div>
                        </div>
                        
                        <Button 
                          className={cn(
                            "w-full h-14 rounded-2xl gap-3 font-bold transition-all duration-300",
                            copied ? "bg-emerald-500 text-white" : "bg-zinc-900 text-white hover:bg-zinc-800"
                          )}
                          onClick={copyCredentials}
                        >
                          {copied ? <Check size={20} /> : <Copy size={20} />}
                          {copied ? 'Credentials Copied!' : 'Copy to Clipboard'}
                        </Button>
                      </div>
                      
                      <Button variant="ghost" className="w-full h-12 rounded-xl text-zinc-500 font-bold" onClick={() => setIsAddDialogOpen(false)}>
                        Finish & Close
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {tableError && (
        <Alert variant="destructive" className="rounded-[32px] border-none bg-rose-50 text-rose-900 p-6">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <AlertTitle className="font-black text-lg">System Configuration Required</AlertTitle>
          <AlertDescription className="font-medium opacity-80">{tableError}</AlertDescription>
        </Alert>
      )}

      <Card className="border-none shadow-sm bg-white rounded-[40px] overflow-hidden">
        <CardHeader className="p-10 pb-6">
          <CardTitle className="text-3xl font-black tracking-tight">Team Directory</CardTitle>
          <CardDescription className="text-zinc-500 font-medium">A comprehensive list of all employees and their current access levels.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="hover:bg-transparent border-zinc-100">
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Name & Identity</TableHead>
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Access Role</TableHead>
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Store Assignments</TableHead>
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.uid} className="hover:bg-zinc-50/50 transition-colors border-zinc-100">
                    <TableCell className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 font-black text-lg border border-zinc-200 shadow-sm">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-zinc-900 text-lg tracking-tight">{emp.name}</p>
                            {emp.uid === user.uid && (
                              <Badge className="bg-brand-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">YOU</Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <Mail size={14} className="text-zinc-400" />
                            {emp.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 py-8">
                      <Select 
                        value={emp.role} 
                        onValueChange={(val) => handleUpdateRole(emp.uid, val as UserRole)}
                        disabled={user.role !== 'admin' && emp.uid !== user.uid}
                      >
                        <SelectTrigger className="w-[160px] h-11 rounded-xl border-zinc-200 bg-white font-bold text-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-zinc-200">
                          <SelectItem value="admin" className="font-bold">Administrator</SelectItem>
                          <SelectItem value="manager" className="font-bold">Manager</SelectItem>
                          <SelectItem value="employee" className="font-bold">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-10 py-8">
                      <PopoverUI>
                        <PopoverTriggerUI asChild>
                          <Button variant="outline" className="w-[220px] justify-between h-11 rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 font-bold text-zinc-700">
                            <span className="truncate">
                              {assignments.filter(a => a.employeeId === emp.uid).length > 0
                                ? `${assignments.filter(a => a.employeeId === emp.uid).length} Stores Assigned`
                                : "No Stores Assigned"}
                            </span>
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTriggerUI>
                        <PopoverContentUI className="w-[280px] p-0 rounded-2xl border-zinc-200 shadow-2xl overflow-hidden" align="start">
                          <div className="p-4 bg-zinc-50 border-b border-zinc-100">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Assign Stores</p>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-3 space-y-1">
                            {stores.map(store => {
                              const isAssigned = assignments.some(a => a.employeeId === emp.uid && a.storeId === store.id);
                              return (
                                <div 
                                  key={store.id} 
                                  className="flex items-center space-x-3 p-3 hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer group"
                                  onClick={() => handleToggleAssignment(emp.uid, store.id, isAssigned)}
                                >
                                  <Checkbox 
                                    id={`store-${store.id}-${emp.uid}`} 
                                    checked={isAssigned}
                                    className="rounded-lg border-zinc-300 data-[state=checked]:bg-brand-500 data-[state=checked]:border-brand-500"
                                    onCheckedChange={() => {}} // Handled by div click
                                  />
                                  <Label 
                                    htmlFor={`store-${store.id}-${emp.uid}`}
                                    className="text-sm font-bold text-zinc-600 group-hover:text-zinc-900 cursor-pointer flex-1"
                                  >
                                    {store.name}
                                  </Label>
                                </div>
                              );
                            })}
                            {stores.length === 0 && (
                              <div className="p-8 text-center">
                                <p className="text-xs text-zinc-400 font-bold">No stores available.</p>
                              </div>
                            )}
                          </div>
                        </PopoverContentUI>
                      </PopoverUI>
                    </TableCell>
                    <TableCell className="px-10 py-8 text-right">
                      <Button variant="ghost" className="h-10 px-4 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 font-bold" disabled>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="px-10 py-24 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-6 bg-zinc-50 rounded-full text-zinc-300">
                          <Users size={48} />
                        </div>
                        <p className="text-zinc-400 font-bold text-lg">No team members found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
