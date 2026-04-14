import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, Store } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Calendar } from '@/components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { CalendarIcon, CheckCircle2, Loader2, Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { generateSampleExcel, parseReportExcel } from '@/lib/excel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';

interface ReportFormProps {
  user: UserProfile;
}

export default function ReportForm({ user }: ReportFormProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  
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
      let storesQuery = supabase.from('stores').select('*');
      if (user.role !== 'admin') {
        storesQuery = storesQuery.eq('id', user.storeId);
      }
      
      const { data: storesData, error } = await storesQuery;
      if (error) {
        console.error('Error fetching stores:', error);
        return;
      }
      
      setStores(storesData as Store[]);
      if (!formData.storeId && storesData.length > 0) {
        setFormData(prev => ({ ...prev, storeId: storesData[0].id }));
      }
    };
    fetchStores();
  }, [user]);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.storeId) return;

    setImporting(true);
    setError(null);
    try {
      const parsedReports = await parseReportExcel(file);
      
      const reportsToInsert = parsedReports.map(report => ({
        ...report,
        storeId: formData.storeId,
        employeeId: user.uid,
        employeeName: user.name,
        createdAt: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('reports')
        .insert(reportsToInsert);

      if (insertError) throw insertError;
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Excel import error:', err);
      setError(err.message || 'Failed to import Excel data. Please check the file format.');
    } finally {
      setImporting(false);
      if (e.target) e.target.value = ''; 
    }
  };

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

      const { error } = await supabase
        .from('reports')
        .insert([{
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
        }]);

      if (error) throw error;

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
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Weekly Performance Report</h1>
        <p className="text-zinc-500">Submit your campaign metrics via Excel or manual entry.</p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="text-emerald-600" />
          <p className="font-medium">Report submitted successfully!</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Excel Import Section */}
        <Card className="lg:col-span-1 border-none shadow-sm bg-white h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" size={20} />
              Excel Import
            </CardTitle>
            <CardDescription>Fastest way to upload bulk data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Store</Label>
              <Select 
                value={formData.storeId} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, storeId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 space-y-3">
              <Button 
                variant="outline" 
                className="w-full gap-2 text-zinc-600"
                onClick={generateSampleExcel}
              >
                <Download size={16} />
                Download Sample
              </Button>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleExcelImport}
                  disabled={importing || !formData.storeId}
                />
                <Button 
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" 
                  disabled={importing || !formData.storeId}
                >
                  {importing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  Import Filled File
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Form Section */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Manual Entry</CardTitle>
            <CardDescription>Enter details for a single campaign manually.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
