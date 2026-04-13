import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { UserProfile, Store } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface ReportFormProps {
  user: UserProfile;
}

export default function ReportForm({ user }: ReportFormProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    storeId: user.storeId || '',
    campaignDate: new Date(),
    campaignName: '',
    purchases: 0,
    costPerPurchase: 0,
    confirmed: 0,
    canceled: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchStores = async () => {
      const storesQuery = user.role === 'admin' 
        ? collection(db, 'stores') 
        : query(collection(db, 'stores'), where('id', '==', user.storeId));
      
      const storesSnap = await getDocs(storesQuery);
      const storesData = storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      setStores(storesData);
      if (!formData.storeId && storesData.length > 0) {
        setFormData(prev => ({ ...prev, storeId: storesData[0].id }));
      }
    };
    fetchStores();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalSpend = formData.purchases * formData.costPerPurchase;
      const netOrders = formData.confirmed - formData.canceled;
      const totalOrders = formData.purchases;
      const cancellationRate = totalOrders > 0 ? (formData.canceled / totalOrders) * 100 : 0;
      const confirmationRate = totalOrders > 0 ? (formData.confirmed / totalOrders) * 100 : 0;
      
      // Simple performance scoring logic
      let performanceScore = 0;
      if (totalOrders > 0) {
        performanceScore = (confirmationRate * 0.6) + (Math.max(0, 100 - cancellationRate) * 0.4);
      }

      await addDoc(collection(db, 'reports'), {
        ...formData,
        campaignDate: formData.campaignDate.toISOString().split('T')[0],
        employeeId: user.uid,
        employeeName: user.name,
        totalSpend,
        netOrders,
        cancellationRate,
        confirmationRate,
        performanceScore,
        createdAt: new Date().toISOString(),
      });

      setSuccess(true);
      setFormData({
        storeId: user.storeId || '',
        campaignDate: new Date(),
        campaignName: '',
        purchases: 0,
        costPerPurchase: 0,
        confirmed: 0,
        canceled: 0,
        pending: 0,
      });
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle>Submit Weekly Report</CardTitle>
          <CardDescription>Enter campaign performance data for the past week.</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Report Submitted!</h3>
              <p className="text-zinc-500">Your performance data has been recorded successfully.</p>
              <Button variant="outline" onClick={() => setSuccess(false)}>Submit Another</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="store">Store / Client</Label>
                  <Select 
                    value={formData.storeId} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, storeId: val }))}
                  >
                    <SelectTrigger id="store">
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map(store => (
                        <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Campaign Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.campaignDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.campaignDate ? format(formData.campaignDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.campaignDate}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, campaignDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input 
                    id="campaignName" 
                    placeholder="e.g. Summer Sale 2024" 
                    value={formData.campaignName}
                    onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchases">Total Purchases</Label>
                  <Input 
                    id="purchases" 
                    type="number" 
                    min="0"
                    value={formData.purchases}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchases: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpp">Cost per Purchase ($)</Label>
                  <Input 
                    id="cpp" 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.costPerPurchase}
                    onChange={(e) => setFormData(prev => ({ ...prev, costPerPurchase: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmed">Confirmed Orders</Label>
                  <Input 
                    id="confirmed" 
                    type="number" 
                    min="0"
                    value={formData.confirmed}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmed: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="canceled">Canceled Orders</Label>
                  <Input 
                    id="canceled" 
                    type="number" 
                    min="0"
                    value={formData.canceled}
                    onChange={(e) => setFormData(prev => ({ ...prev, canceled: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pending">Pending Orders</Label>
                  <Input 
                    id="pending" 
                    type="number" 
                    min="0"
                    value={formData.pending}
                    onChange={(e) => setFormData(prev => ({ ...prev, pending: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-zinc-500">Estimated Total Spend: </span>
                  <span className="font-bold text-zinc-900">${(formData.purchases * formData.costPerPurchase).toLocaleString()}</span>
                </div>
                <Button type="submit" disabled={loading} className="px-8">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Report
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
