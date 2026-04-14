import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog.tsx';
import { Store as StoreIcon, Plus, RefreshCw, Loader2, Calendar } from 'lucide-react';

export default function StoreManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreAov, setNewStoreAov] = useState('100');
  const [isCreating, setIsCreating] = useState(false);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setStores(data as Store[]);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('stores')
        .insert([{ 
          name: newStoreName.trim(),
          average_order_value: Number(newStoreAov)
        }]);

      if (error) throw error;
      
      setNewStoreName('');
      setNewStoreAov('100');
      setIsAddDialogOpen(false);
      fetchStores();
    } catch (error) {
      console.error('Error adding store:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading && stores.length === 0) {
    return (
      <div className="flex flex-col h-96 items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
        <p className="text-zinc-500 font-bold animate-pulse">Loading Portfolio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-[10px] uppercase tracking-[0.2em]">
            <StoreIcon size={14} />
            <span>Portfolio Management</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900">Store Directory</h1>
          <p className="text-zinc-500 max-w-2xl text-lg font-medium">Manage your client stores and their primary data sources.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-2xl h-12 w-12 border-zinc-200 bg-white hover:bg-zinc-50 transition-all"
            onClick={() => fetchStores()} 
            disabled={loading}
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-8 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg shadow-zinc-900/20 gap-2 font-bold">
                <Plus size={20} /> Register New Store
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
              <div className="p-8 bg-zinc-950 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight text-white">Add Client Store</DialogTitle>
                  <DialogDescription className="text-zinc-400 font-medium">
                    Register a new store to start tracking its performance.
                  </DialogDescription>
                </DialogHeader>
              </div>
              
              <div className="p-8 bg-white">
                <form onSubmit={handleAddStore} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Store Name</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Fashion Hub Global" 
                      className="h-12 rounded-xl border-zinc-200 bg-zinc-50 focus:ring-brand-500"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aov" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Average Order Value ($)</Label>
                    <Input 
                      id="aov" 
                      type="number"
                      placeholder="100" 
                      className="h-12 rounded-xl border-zinc-200 bg-zinc-50 focus:ring-brand-500"
                      value={newStoreAov}
                      onChange={(e) => setNewStoreAov(e.target.value)}
                      required 
                    />
                    <p className="text-[10px] text-zinc-400 font-medium">Used to calculate estimated revenue and ROAS.</p>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-lg shadow-brand-500/20" disabled={isCreating}>
                      {isCreating ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                      Create Store Profile
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stores.map((store) => (
          <Card key={store.id} className="border-none shadow-sm bg-white rounded-[40px] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="p-10 pb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shadow-sm group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                  <StoreIcon size={28} />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-black tracking-tight text-zinc-900 group-hover:text-brand-600 transition-colors">{store.name}</CardTitle>
              <CardDescription className="text-zinc-500 font-medium flex items-center gap-2 mt-2">
                <Calendar size={14} className="text-zinc-400" />
                Created {new Date(store.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-10 pb-10">
              <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Store ID</p>
                  <p className="text-xs font-mono text-zinc-500 font-medium">{store.id.slice(0, 12)}...</p>
                </div>
                <Button variant="ghost" className="h-10 px-4 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 font-bold" disabled>
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {stores.length === 0 && !loading && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center space-y-6 bg-white rounded-[40px] border-2 border-dashed border-zinc-200">
            <div className="p-8 bg-zinc-50 rounded-full text-zinc-300">
              <StoreIcon size={64} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-zinc-900 tracking-tight">No stores registered</h3>
              <p className="text-zinc-500 font-medium">Register your first client store to start tracking data.</p>
            </div>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="h-12 px-8 rounded-xl bg-brand-500 text-white font-bold"
            >
              Add First Store
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
