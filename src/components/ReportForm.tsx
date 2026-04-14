import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Store, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select.tsx';
import { 
  Calendar as CalendarIcon, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { cn } from '@/lib/utils';
import { generateSampleExcel, parseReportExcel } from '@/lib/excel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';

interface ReportFormProps {
  user: UserProfile;
}

export default function ReportForm({ user }: ReportFormProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    storeId: '',
    campaignName: '',
    campaignDate: new Date(),
    purchases: 0,
    costPerPurchase: 0,
    confirmed: 0,
    canceled: 0,
    roas: 0
  });

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('*')
          .order('name', { ascending: true });
        
        if (storesError) throw storesError;

        if (user.role !== 'admin') {
          const { data: assignments, error: assignError } = await supabase
            .from('store_assignments')
            .select('storeId')
            .eq('employeeId', user.uid);
          
          if (assignError) throw assignError;
          const assignedStoreIds = assignments.map(a => a.storeId);
          setStores((storesData as Store[]).filter(s => assignedStoreIds.includes(s.id)));
        } else {
          setStores(storesData as Store[]);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
      }
    };

    fetchStores();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.storeId) throw new Error('Please select a store');

      const selectedStore = stores.find(s => s.id === formData.storeId);
      const aov = selectedStore?.averageOrderValue || 100;

      const totalSpend = formData.purchases * formData.costPerPurchase;
      
      let revenue = 0;
      let roas = formData.roas;

      if (roas > 0) {
        revenue = roas * totalSpend;
      } else {
        revenue = formData.confirmed * aov;
        roas = totalSpend > 0 ? revenue / totalSpend : 0;
      }

      const confirmationRate = formData.purchases > 0 ? (formData.confirmed / formData.purchases) * 100 : 0;
      const cancellationRate = formData.purchases > 0 ? (formData.canceled / formData.purchases) * 100 : 0;
      
      // Performance score calculation
      const performanceScore = Math.min(100, (roas * 20) + (confirmationRate * 0.4));

      const { error: insertError } = await supabase
        .from('reports')
        .insert([{
          storeId: formData.storeId,
          campaignName: formData.campaignName,
          campaignDate: format(formData.campaignDate, 'yyyy-MM-dd'),
          purchases: formData.purchases,
          costPerPurchase: formData.costPerPurchase,
          totalSpend,
          confirmed: formData.confirmed,
          canceled: formData.canceled,
          revenue,
          roas,
          confirmationRate,
          cancellationRate,
          performanceScore,
          submittedBy: user.uid
        }]);

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        storeId: formData.storeId,
        campaignName: '',
        campaignDate: new Date(),
        purchases: 0,
        costPerPurchase: 0,
        confirmed: 0,
        canceled: 0
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.storeId) return;

    setImporting(true);
    setError(null);
    setSuccess(false);

    try {
      const reports = await parseReportExcel(file);
      const selectedStore = stores.find(s => s.id === formData.storeId);
      const aov = selectedStore?.averageOrderValue || 100;
      
      const reportsToInsert = reports.map(report => {
        const purchases = report.purchases || 0;
        const cpp = report.costPerPurchase || 0;
        const confirmed = report.confirmed || 0;
        const excelRoas = report.roas || 0;

        const totalSpend = purchases * cpp;
        
        let revenue = 0;
        let roas = excelRoas;

        if (roas > 0) {
          revenue = roas * totalSpend;
        } else {
          revenue = confirmed * aov;
          roas = totalSpend > 0 ? revenue / totalSpend : 0;
        }

        const confirmationRate = purchases > 0 ? (confirmed / purchases) * 100 : 0;
        const cancellationRate = purchases > 0 ? ((report.canceled || 0) / purchases) * 100 : 0;
        const performanceScore = Math.min(100, (roas * 20) + (confirmationRate * 0.4));

        return {
          ...report,
          storeId: formData.storeId,
          totalSpend,
          revenue,
          roas,
          confirmationRate,
          cancellationRate,
          performanceScore,
          submittedBy: user.uid
        };
      });

      const { error: insertError } = await supabase
        .from('reports')
        .insert(reportsToInsert);

      if (insertError) throw insertError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to import Excel file');
    } finally {
      setImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-[10px] uppercase tracking-[0.2em]">
            <FileText size={14} />
            <span>Data Entry Portal</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900">Submit Performance</h1>
          <p className="text-zinc-500 max-w-2xl text-lg font-medium">Upload campaign data manually or via bulk Excel import.</p>
        </div>
      </div>

      {success && (
        <Alert className="rounded-[32px] border-none bg-emerald-50 text-emerald-900 p-6 shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <div className="ml-2">
            <AlertTitle className="font-black text-lg">Submission Successful</AlertTitle>
            <AlertDescription className="font-medium opacity-80">Your campaign data has been recorded and is now live on the dashboard.</AlertDescription>
          </div>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="rounded-[32px] border-none bg-rose-50 text-rose-900 p-6 shadow-lg shadow-rose-500/10">
          <AlertCircle className="h-6 w-6 text-rose-600" />
          <div className="ml-2">
            <AlertTitle className="font-black text-lg">Submission Failed</AlertTitle>
            <AlertDescription className="font-medium opacity-80">{error}</AlertDescription>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm bg-white rounded-[40px] overflow-hidden">
            <CardHeader className="p-10 pb-6">
              <CardTitle className="text-3xl font-black tracking-tight">Manual Entry</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">Enter individual campaign metrics for precise tracking.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="store" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Store</Label>
                    <Select value={formData.storeId} onValueChange={(val) => setFormData(prev => ({ ...prev, storeId: val }))}>
                      <SelectTrigger className="h-14 rounded-2xl border-zinc-200 bg-zinc-50 focus:ring-brand-500 font-bold">
                        <SelectValue placeholder="Select a store" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-zinc-200">
                        {stores.map(store => (
                          <SelectItem key={store.id} value={store.id} className="font-bold">{store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Campaign Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-14 justify-start text-left font-bold rounded-2xl border-zinc-200 bg-zinc-50",
                            !formData.campaignDate && "text-zinc-400"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-5 w-5 text-zinc-400" />
                          {formData.campaignDate ? format(formData.campaignDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-3xl border-zinc-200 shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.campaignDate}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, campaignDate: date }))}
                          initialFocus
                          className="rounded-3xl"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label htmlFor="campaignName" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Campaign Name</Label>
                    <Input 
                      id="campaignName" 
                      placeholder="e.g. Summer Collection 2024 - Facebook Ads" 
                      className="h-14 rounded-2xl border-zinc-200 bg-zinc-50 focus:ring-brand-500 font-bold"
                      value={formData.campaignName}
                      onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
                      required 
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="purchases" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Purchases</Label>
                    <Input 
                      id="purchases" 
                      type="number" 
                      className="h-14 rounded-2xl border-zinc-200 bg-zinc-50 focus:ring-brand-500 font-bold"
                      value={formData.purchases}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchases: Number(e.target.value) }))}
                      required 
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="costPerPurchase" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cost Per Purchase ($)</Label>
                    <Input 
                      id="costPerPurchase" 
                      type="number" 
                      step="0.01"
                      className="h-14 rounded-2xl border-zinc-200 bg-zinc-50 focus:ring-brand-500 font-bold"
                      value={formData.costPerPurchase}
                      onChange={(e) => setFormData(prev => ({ ...prev, costPerPurchase: Number(e.target.value) }))}
                      required 
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="confirmed" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Confirmed Orders</Label>
                    <Input 
                      id="confirmed" 
                      type="number" 
                      className="h-14 rounded-2xl border-zinc-200 bg-zinc-50 focus:ring-brand-500 font-bold"
                      value={formData.confirmed}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmed: Number(e.target.value) }))}
                      required 
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="canceled" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Canceled Orders</Label>
                    <Input 
                      id="canceled" 
                      type="number" 
                      className="h-14 rounded-2xl border-zinc-200 bg-zinc-50 focus:ring-brand-500 font-bold"
                      value={formData.canceled}
                      onChange={(e) => setFormData(prev => ({ ...prev, canceled: Number(e.target.value) }))}
                      required 
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="roas" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Campaign ROAS (Optional)</Label>
                    <Input 
                      id="roas" 
                      type="number" 
                      step="0.01"
                      placeholder="e.g. 3.5"
                      className="h-14 rounded-2xl border-zinc-200 bg-zinc-50 focus:ring-brand-500 font-bold"
                      value={formData.roas}
                      onChange={(e) => setFormData(prev => ({ ...prev, roas: Number(e.target.value) }))}
                    />
                    <p className="text-[10px] text-zinc-400 font-medium italic">If provided, revenue will be calculated as ROAS × Spend.</p>
                  </div>
                </div>

                <div className="pt-6">
                  <Button type="submit" className="w-full h-16 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-lg font-black shadow-xl shadow-brand-500/20 transition-all active:scale-[0.98]" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-3" size={24} /> : null}
                    Submit Campaign Report
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-10">
          <Card className="border-none shadow-sm bg-zinc-950 text-white rounded-[40px] overflow-hidden">
            <CardHeader className="p-10 pb-6">
              <div className="flex items-center gap-2 text-brand-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
                <Upload size={16} />
                <span>Bulk Operations</span>
              </div>
              <CardTitle className="text-3xl font-black tracking-tighter">Excel Import</CardTitle>
              <CardDescription className="text-zinc-400 font-medium">Upload multiple reports at once using our template.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-8">
              <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-brand-500/20 text-brand-400 rounded-2xl flex items-center justify-center">
                  <FileSpreadsheet size={32} />
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-white">Need the template?</p>
                  <p className="text-sm text-zinc-500 font-medium">Download our structured Excel file to ensure data compatibility.</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl border-white/20 text-white hover:bg-white/10 font-bold"
                  onClick={generateSampleExcel}
                >
                  <Download className="mr-2" size={18} /> Download Template
                </Button>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Upload Data File</Label>
                <div className="relative group">
                  <Input 
                    type="file" 
                    accept=".xlsx, .xls"
                    className="hidden" 
                    id="excel-upload"
                    onChange={handleExcelImport}
                    disabled={importing || !formData.storeId}
                  />
                  <Label 
                    htmlFor="excel-upload"
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-[32px] cursor-pointer transition-all",
                      !formData.storeId ? "opacity-50 cursor-not-allowed border-zinc-800" : "border-zinc-800 hover:border-brand-500 hover:bg-brand-500/5"
                    )}
                  >
                    {importing ? (
                      <Loader2 className="animate-spin text-brand-400" size={32} />
                    ) : (
                      <>
                        <Upload className="text-zinc-600 group-hover:text-brand-400 transition-colors mb-4" size={32} />
                        <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">Click to upload Excel</span>
                      </>
                    )}
                  </Label>
                </div>
                {!formData.storeId && (
                  <p className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Select a store first
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
