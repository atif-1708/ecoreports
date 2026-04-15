import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { CampaignReport, Store, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table.tsx';
import { 
  FileText, 
  Download, 
  Eye, 
  MoreHorizontal, 
  TrendingUp, 
  TrendingDown,
  User,
  Store as StoreIcon,
  Target,
  DollarSign,
  BarChart3,
  Package,
  Filter,
  Search,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select.tsx';
import { Input } from '@/components/ui/input.tsx';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

interface ReportsProps {
  user: UserProfile;
}

export default function Reports({ user }: ReportsProps) {
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<CampaignReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filters
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: storesData } = await supabase.from('stores').select('*');
      setStores(storesData as Store[] || []);

      let query = supabase
        .from('reports')
        .select('*')
        .order('campaignDate', { ascending: false });

      if (user.role !== 'admin') {
        query = query.eq('submittedBy', user.uid);
      }

      const { data: reportsData } = await query;
      setReports(reportsData as CampaignReport[] || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesStore = filterStore === 'all' || report.storeId === filterStore;
      const matchesEmployee = filterEmployee === 'all' || report.employeeId === filterEmployee;
      const matchesProduct = filterProduct === 'all' || report.productName === filterProduct;
      const matchesSearch = report.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (report.productName?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesStore && matchesEmployee && matchesProduct && matchesSearch;
    });
  }, [reports, filterStore, filterEmployee, filterProduct, searchQuery]);

  const employees = useMemo(() => {
    const unique = new Set(reports.map(r => r.employeeId).filter(Boolean));
    return Array.from(unique).map(id => {
      const report = reports.find(r => r.employeeId === id);
      return { id, name: report?.employeeName || 'Unknown' };
    });
  }, [reports]);

  const products = useMemo(() => {
    const unique = new Set(reports.map(r => r.productName).filter(Boolean));
    return Array.from(unique).sort();
  }, [reports]);

  const stats = useMemo(() => {
    const totalRevenue = filteredReports.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const totalSpend = filteredReports.reduce((sum, r) => sum + (r.totalSpend || 0), 0);
    const totalConfirmed = filteredReports.reduce((sum, r) => sum + (r.confirmed || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    
    return { totalRevenue, totalSpend, totalConfirmed, avgRoas };
  }, [filteredReports]);

  const topCampaigns = useMemo(() => {
    return [...filteredReports]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 5);
  }, [filteredReports]);

  const topProducts = useMemo(() => {
    const productStats: Record<string, number> = {};
    filteredReports.forEach(r => {
      const p = r.productName || 'General';
      productStats[p] = (productStats[p] || 0) + (r.revenue || 0);
    });
    return Object.entries(productStats)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredReports]);

  const handleViewDetails = (report: CampaignReport) => {
    setSelectedReport(report);
    setIsDetailOpen(true);
  };

  const formatDateSafely = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, 'MMM d, yyyy') : 'Invalid Date';
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-96 items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
        <p className="text-zinc-500 font-bold animate-pulse">Loading Audit Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-[10px] uppercase tracking-[0.2em]">
            <FileText size={14} />
            <span>Audit & Analysis</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900">Reporting Center</h1>
          <p className="text-zinc-500 max-w-2xl text-lg font-medium">
            Analyze campaign performance, product trends, and employee contributions in one place.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-[32px] p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Revenue</p>
              <p className="text-2xl font-black text-zinc-900">Rs. {stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-[32px] p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Avg. ROAS</p>
              <p className="text-2xl font-black text-zinc-900">{stats.avgRoas.toFixed(2)}x</p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-[32px] p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Target size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Spend</p>
              <p className="text-2xl font-black text-zinc-900">Rs. {stats.totalSpend.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-[32px] p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Confirmed Orders</p>
              <p className="text-2xl font-black text-zinc-900">{stats.totalConfirmed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="border-none shadow-sm bg-white rounded-[40px] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="text-brand-500" size={20} />
              Top Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="space-y-4">
              {topCampaigns.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl hover:bg-brand-50 transition-all group">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-zinc-300 group-hover:text-brand-400">0{i+1}</span>
                    <div>
                      <p className="font-black text-zinc-900">{c.campaignName}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{c.productName || 'General'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-brand-600">Rs. {c.revenue.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{c.roas.toFixed(2)}x ROAS</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-[40px] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Package className="text-indigo-500" size={20} />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl hover:bg-indigo-50 transition-all group">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-zinc-300 group-hover:text-indigo-400">0{i+1}</span>
                    <p className="font-black text-zinc-900">{p.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-indigo-600">Rs. {p.revenue.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card className="border-none shadow-sm bg-white rounded-[40px] overflow-hidden">
        <CardHeader className="p-10 pb-6 border-b border-zinc-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black tracking-tight">Report History</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">Filter and analyze granular campaign data.</CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <Input 
                  placeholder="Search campaigns..." 
                  className="pl-10 w-[200px] h-10 rounded-xl border-zinc-200 bg-zinc-50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={filterStore} onValueChange={setFilterStore}>
                <SelectTrigger className="w-[160px] h-10 rounded-xl border-zinc-200 bg-zinc-50 font-bold">
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="w-[160px] h-10 rounded-xl border-zinc-200 bg-zinc-50 font-bold">
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="w-[160px] h-10 rounded-xl border-zinc-200 bg-zinc-50 font-bold">
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="hover:bg-transparent border-zinc-100">
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Campaign & Product</TableHead>
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Store</TableHead>
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Employee</TableHead>
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">ROAS</TableHead>
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">CPA</TableHead>
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Revenue</TableHead>
                  <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-zinc-50/50 transition-colors border-zinc-100 group">
                    <TableCell className="px-10 py-8">
                      <div className="space-y-1">
                        <p className="font-black text-zinc-900 text-lg tracking-tight group-hover:text-brand-600 transition-colors">{report.campaignName}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-500 rounded-md px-1.5">
                            {report.productName || 'General'}
                          </Badge>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{formatDateSafely(report.campaignDate)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 py-8">
                      <Badge variant="outline" className="rounded-xl border-zinc-200 bg-zinc-50 text-zinc-600 font-bold px-3 py-1">
                        {stores.find(s => s.id === report.storeId)?.name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-10 py-8">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                          <User size={14} />
                        </div>
                        <span className="text-sm font-bold text-zinc-600">{report.employeeName || 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 py-8 text-right">
                      <Badge 
                        className={cn(
                          "rounded-xl font-black px-3 py-1",
                          report.roas >= 3 ? "bg-emerald-500 text-white" : 
                          report.roas >= 2 ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-500"
                        )}
                      >
                        {report.roas.toFixed(2)}x
                      </Badge>
                    </TableCell>
                    <TableCell className="px-10 py-8 text-right font-black text-zinc-900 data-value">
                      Rs. {report.cpa.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-10 py-8 text-right font-black text-zinc-900 text-lg data-value">
                      Rs. {report.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-10 py-8 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl hover:bg-zinc-100"
                        onClick={() => handleViewDetails(report)}
                      >
                        <ChevronRight size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReports.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300">
                          <FileText size={40} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xl font-black text-zinc-900">No reports found</p>
                          <p className="text-zinc-500 font-medium">Try adjusting your filters or search query.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Report Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-zinc-50">
          {selectedReport && (
            <>
              <div className="bg-zinc-950 p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                  <BarChart3 size={200} />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-brand-500 hover:bg-brand-500 text-white rounded-xl px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">
                      Campaign Analysis
                    </Badge>
                    <p className="text-zinc-400 font-bold text-sm uppercase tracking-widest">
                      {format(parseISO(selectedReport.campaignDate), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-5xl font-black tracking-tighter leading-none">{selectedReport.campaignName}</h2>
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                        <StoreIcon size={16} className="text-brand-400" />
                        <span className="font-bold text-sm">{stores.find(s => s.id === selectedReport.storeId)?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                        <User size={16} className="text-brand-400" />
                        <span className="font-bold text-sm">{selectedReport.employeeName || 'System'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-10">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-[32px] shadow-sm space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Revenue</p>
                    <p className="text-3xl font-black text-zinc-900 data-value">Rs. {selectedReport.revenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] shadow-sm space-y-2 border-l-4 border-brand-500">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">ROAS</p>
                    <p className="text-3xl font-black text-zinc-900">{selectedReport.roas.toFixed(2)}x</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] shadow-sm space-y-2 border-l-4 border-amber-500">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">CPA</p>
                    <p className="text-3xl font-black text-zinc-900 data-value">Rs. {selectedReport.cpa.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] shadow-sm space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Spend</p>
                    <p className="text-3xl font-black text-zinc-900 data-value">Rs. {selectedReport.totalSpend.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-xl font-black tracking-tight text-zinc-900 flex items-center gap-2">
                      <Target size={20} className="text-brand-500" />
                      Conversion Funnel
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Confirmed Orders</p>
                            <p className="text-2xl font-black text-emerald-600">{selectedReport.confirmed}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Rate</p>
                            <p className="text-2xl font-black text-zinc-900">{selectedReport.confirmationRate.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedReport.confirmationRate}%` }}></div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Canceled Orders</p>
                            <p className="text-2xl font-black text-rose-600">{selectedReport.canceled}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Rate</p>
                            <p className="text-2xl font-black text-zinc-900">{selectedReport.cancellationRate.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${selectedReport.cancellationRate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-black tracking-tight text-zinc-900 flex items-center gap-2">
                      <TrendingUp size={20} className="text-brand-500" />
                      Performance Score
                    </h3>
                    <div className="bg-zinc-900 p-10 rounded-[40px] flex flex-col items-center justify-center text-center space-y-6 shadow-2xl shadow-zinc-900/20">
                      <div className="relative h-40 w-40 flex items-center justify-center">
                        <svg className="h-full w-full -rotate-90">
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="transparent"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="12"
                          />
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="transparent"
                            stroke={selectedReport.performanceScore > 80 ? "#10b981" : selectedReport.performanceScore > 50 ? "#f59e0b" : "#f43f5e"}
                            strokeWidth="12"
                            strokeDasharray={440}
                            strokeDashoffset={440 - (440 * selectedReport.performanceScore) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-5xl font-black text-white">{Math.round(selectedReport.performanceScore)}</span>
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Score</span>
                        </div>
                      </div>
                      <p className="text-zinc-400 font-medium text-sm">
                        This campaign is performing <span className="text-white font-bold">{selectedReport.performanceScore > 70 ? 'above' : 'below'}</span> agency benchmarks.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
