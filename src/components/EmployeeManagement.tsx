import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc, orderBy } from 'firebase/firestore';
import { UserProfile, Store, UserRole } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
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
      const storesQuery = user.role === 'admin' 
        ? collection(db, 'stores') 
        : query(collection(db, 'stores'), where('id', '==', user.storeId));
      
      const storesSnap = await getDocs(storesQuery);
      const storesData = storesSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Store));
      setStores(storesData);

      // Fetch employees
      let employeesQuery;
      if (user.role === 'admin') {
        employeesQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      } else {
        employeesQuery = query(collection(db, 'users'), where('storeId', '==', user.storeId));
      }

      const employeesSnap = await getDocs(employeesQuery);
      setEmployees(employeesSnap.docs.map(doc => ({ uid: doc.id, ...(doc.data() as object) } as UserProfile)));
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (uid: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleUpdateStore = async (uid: string, storeId: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { storeId });
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-y border-zinc-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name & Email</th>
                  <th className="px-6 py-4 font-semibold">Current Role</th>
                  <th className="px-6 py-4 font-semibold">Assigned Store</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {employees.map((emp) => (
                  <tr key={emp.uid} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{emp.name}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Mail size={12} />
                            {emp.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" disabled>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                      No team members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
