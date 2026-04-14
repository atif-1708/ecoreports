import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, Store } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table.tsx';
import { Plus, Trash2, Store as StoreIcon, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface StoreManagementProps {
  user: UserProfile;
}

export default function StoreManagement({ user }: StoreManagementProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStoreName, setNewStoreName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      setStores(data as Store[]);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    setIsAdding(true);

    try {
      const { error } = await supabase
        .from('stores')
        .insert([{
          name: newStoreName,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
        }]);
      
      if (error) throw error;
      setNewStoreName('');
      fetchStores();
    } catch (error) {
      console.error('Error adding store:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store? This will not delete associated reports.')) return;
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchStores();
    } catch (error) {
      console.error('Error deleting store:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Store Management</h1>
          <p className="text-zinc-500">Create and manage client accounts and business stores.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-none shadow-sm bg-white h-fit">
          <CardHeader>
            <CardTitle>Add New Store</CardTitle>
            <CardDescription>Create a separate workspace for a new client.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddStore} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input 
                  id="storeName" 
                  placeholder="e.g. Nike Global" 
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isAdding}>
                <Plus size={18} />
                {isAdding ? 'Adding...' : 'Create Store'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader>
            <CardTitle>Active Stores</CardTitle>
            <CardDescription>A list of all client stores currently managed by your agency.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">Store Name</TableHead>
                  <TableHead className="px-6 py-4">Created Date</TableHead>
                  <TableHead className="px-6 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id} className="hover:bg-zinc-50 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                          <StoreIcon size={16} />
                        </div>
                        <span className="font-medium text-zinc-900">{store.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-zinc-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {format(parseISO(store.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-zinc-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteStore(store.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {stores.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={3} className="px-6 py-12 text-center text-zinc-400">
                      No stores found. Create your first store to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
