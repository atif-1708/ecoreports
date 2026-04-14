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

      const cpa = formData.confirmed > 0 ? totalSpend / formData.confirmed : 0;
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
          cpa,
          confirmationRate,
          cancellationRate,
          performanceScore,
          submittedBy: user.uid,
          employeeName: user.name,
          employeeId: user.uid
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

        const cpa = confirmed > 0 ? totalSpend / confirmed : 0;
        const confirmationRate = purchases > 0 ? (confirmed / purchases) * 100 : 0;
        const cancellationRate = purchases > 0 ? ((report.canceled || 0) / purchases) * 100 : 0;
        const performanceScore = Math.min(100, (roas * 20) + (confirmationRate * 0.4));

        return {
          ...report,
          storeId: formData.storeId,
          totalSpend,
          revenue,
          roas,
          cpa,
          confirmationRate,
          cancellationRate,
          performanceScore,
          submittedBy: user.uid,
          employeeName: user.name,
          employeeId: user.uid
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

      <div className="grid grid-cols-1 gap-10">
        <Card className="border-none shadow-sm bg-zinc-950 text-white rounded-[40px] overflow-hidden">
          <CardHeader className="p-10 pb-6">
            <div className="flex items-center gap-2 text-brand-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
              <Upload size={16} />
              <span>Bulk Operations</span>
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter">Excel Import System</CardTitle>
            <CardDescription className="text-zinc-400 font-medium">Upload campaign reports via bulk Excel import for automated processing.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="store" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">1. Select Target Store</Label>
                  <Select value={formData.storeId} onValueChange={(val) => setFormData(prev => ({ ...prev, storeId: val }))}>
                    <SelectTrigger className="h-14 rounded-2xl border-white/10 bg-white/5 focus:ring-brand-500 font-bold text-white">
                      <SelectValue>
                        {formData.storeId ? stores.find(s => s.id === formData.storeId)?.name : "Choose a store to import data for"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-zinc-800 bg-zinc-900 text-white">
                      {stores.map(store => (
                        <SelectItem key={store.id} value={store.id} className="font-bold hover:bg-zinc-800 focus:bg-zinc-800">{store.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.storeId && (
                    <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">
                      Store Selected: {stores.find(s => s.id === formData.storeId)?.name}
                    </p>
                  )}
                </div>

                <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-brand-500/20 text-brand-400 rounded-2xl flex items-center justify-center">
                    <FileSpreadsheet size={32} />
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-white">2. Download Template</p>
                    <p className="text-sm text-zinc-500 font-medium">Use our structured Excel file to ensure data compatibility.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-white/20 text-white hover:bg-white/10 font-bold"
                    onClick={generateSampleExcel}
                  >
                    <Download className="mr-2" size={18} /> Download Template
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">3. Upload Data File</Label>
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
                      "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-[32px] cursor-pointer transition-all",
                      !formData.storeId ? "opacity-50 cursor-not-allowed border-zinc-800" : "border-zinc-800 hover:border-brand-500 hover:bg-brand-500/5"
                    )}
                  >
                    {importing ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-brand-400" size={48} />
                        <span className="text-sm font-bold text-brand-400">Processing Data...</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-6 bg-white/5 rounded-full mb-4 group-hover:bg-brand-500/10 transition-colors">
                          <Upload className="text-zinc-600 group-hover:text-brand-400 transition-colors" size={40} />
                        </div>
                        <span className="text-lg font-black text-zinc-400 group-hover:text-white transition-colors">Click to upload Excel</span>
                        <p className="text-sm text-zinc-600 mt-2">Only .xlsx and .xls files supported</p>
                      </>
                    )}
                  </Label>
                </div>
                {!formData.storeId && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                    <AlertCircle className="text-rose-400" size={16} />
                    <p className="text-xs text-rose-400 font-black uppercase tracking-wider">Select a store first to enable upload</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
