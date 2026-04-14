import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, Store, UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table.tsx';
import { Users, Mail, Shield, Store as StoreIcon } from 'lucide-react';

interface EmployeeManagementProps {
  user: UserProfile;
}

export default function EmployeeManagement({ user }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Employee Management</h1>
        <p className="text-zinc-500">Manage team roles and assign employees to client stores.</p>
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
