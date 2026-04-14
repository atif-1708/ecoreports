import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { CampaignReport, Store, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  CheckCircle2, AlertCircle, RefreshCw, Search, Sparkles, 
  Loader2, BarChart3, XCircle, Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCampaignInsights } from '@/lib/gemini';

interface DashboardProps {
  user: UserProfile;
}

export default function Dashboard({ user }: DashboardProps) {
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stores first
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true });
      
      if (storesError) throw storesError;
      
      let assignedStoreIds: string[] = [];
      if (user.role !== 'admin') {
        const { data: assignments, error: assignError } = await supabase
          .from('store_assignments')
          .select('storeId')
          .eq('employeeId', user.uid);
        
        if (assignError) throw assignError;
        assignedStoreIds = assignments.map(a => a.storeId);
      }

      const filteredStores = user.role === 'admin' 
        ? (storesData as Store[]) 
        : (storesData as Store[]).filter(s => assignedStoreIds.includes(s.id));
      
      setStores(filteredStores);

      // Fetch reports
      let reportsQuery = supabase
        .from('reports')
        .select('*')
        .order('campaignDate', { ascending: false });

      if (user.role !== 'admin') {
        if (assignedStoreIds.length > 0) {
          reportsQuery = reportsQuery.in('storeId', assignedStoreIds);
        } else {
          setReports([]);
          setLoading(false);
          return;
        }
      }

      if (selectedStore !== 'all') {
        reportsQuery = reportsQuery.eq('storeId', selectedStore);
      } else if (user.role === 'admin') {
        reportsQuery = reportsQuery.limit(100);
      }

      const { data: reportsData, error: reportsError } = await reportsQuery;
      if (reportsError) throw reportsError;
      setReports(reportsData as CampaignReport[]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, selectedStore]);

  const filteredReports = useMemo(() => {
    return reports.filter(report => 
      report.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

  const stats = useMemo(() => {
    const totalSpend = filteredReports.reduce((sum, r) => sum + r.totalSpend, 0);
    const totalRevenue = filteredReports.reduce((sum, r) => sum + r.revenue, 0);
    const totalConfirmed = filteredReports.reduce((sum, r) => sum + r.confirmed, 0);
    const totalCanceled = filteredReports.reduce((sum, r) => sum + r.canceled, 0);
    const totalPurchases = filteredReports.reduce((sum, r) => sum + r.purchases, 0);
    
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgConfirmationRate = totalPurchases > 0 ? (totalConfirmed / totalPurchases) * 100 : 0;
    const avgCancellationRate = totalPurchases > 0 ? (totalCanceled / totalPurchases) * 100 : 0;
    const totalNetOrders = totalConfirmed - totalCanceled;

    return {
      totalSpend,
      totalRevenue,
      totalConfirmed,
      totalCanceled,
      totalNetOrders,
      avgRoas,
      avgConfirmationRate,
      avgCancellationRate
    };
  }, [filteredReports]);

  const chartData = useMemo(() => {
    const dailyData: Record<string, { date: string, revenue: number, spend: number }> = {};
    
    filteredReports.slice(0, 30).forEach(report => {
      const date = report.campaignDate;
      if (!dailyData[date]) {
        dailyData[date] = { date: format(parseISO(date), 'MMM d'), revenue: 0, spend: 0 };
      }
      dailyData[date].revenue += report.revenue;
      dailyData[date].spend += report.totalSpend;
    });

    return Object.values(dailyData).reverse();
  }, [filteredReports]);

  const pieData = useMemo(() => {
    const storeRevenue: Record<string, number> = {};
    filteredReports.forEach(report => {
      const storeName = stores.find(s => s.id === report.storeId)?.name || 'Unknown';
      storeRevenue[storeName] = (storeRevenue[storeName] || 0) + report.revenue;
    });

    return Object.entries(storeRevenue).map(([name, value]) => ({ name, value }));
  }, [filteredReports, stores]);

  const generateInsights = async () => {
    if (filteredReports.length === 0) return;
    setIsGeneratingInsights(true);
    try {
      const insights = await getCampaignInsights(filteredReports);
      setAiInsights(insights);
    } catch (error) {
      console.error('Error generating insights:', error);
      setAiInsights('Failed to generate insights. Please try again later.');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const COLORS = ['#3359f4', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

  if (loading) {
    return (
      <div className="flex flex-col h-96 items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
        <p className="text-zinc-500 font-bold animate-pulse">Synchronizing Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-600 font-bold text-[10px] uppercase tracking-[0.2em]">
            <BarChart3 size={14} />
            <span>Performance Intelligence</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900">
            {user.role === 'admin' ? 'Agency Overview' : 'My Performance'}
          </h1>
          <p className="text-zinc-500 max-w-2xl text-lg font-medium">
            Real-time analytics across your assigned stores and active campaigns.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand-500 transition-colors" size={18} />
            <Input 
              placeholder="Search campaigns..." 
              className="pl-12 w-[280px] h-12 bg-white border-zinc-200 rounded-2xl focus:ring-brand-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm">
            <Button 
              variant={viewMode === 'summary' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn(
                "rounded-xl h-9 px-4 text-xs font-bold uppercase tracking-wider transition-all",
                viewMode === 'summary' ? "bg-zinc-900 text-white" : "text-zinc-500"
              )}
              onClick={() => setViewMode('summary')}
            >
              Summary
            </Button>
            <Button 
              variant={viewMode === 'detailed' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn(
                "rounded-xl h-9 px-4 text-xs font-bold uppercase tracking-wider transition-all",
                viewMode === 'detailed' ? "bg-zinc-900 text-white" : "text-zinc-500"
              )}
              onClick={() => setViewMode('detailed')}
            >
              Detailed
            </Button>
          </div>

          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-2xl h-12 w-12 border-zinc-200 bg-white hover:bg-zinc-50 transition-all"
            onClick={() => fetchData()} 
            disabled={loading}
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {viewMode === 'summary' ? (
        <>
          {/* Filter Bar */}
          <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
            <Button
              variant={selectedStore === 'all' ? 'default' : 'outline'}
              className={cn(
                "rounded-2xl px-8 h-11 text-sm font-bold transition-all",
                selectedStore === 'all' ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
              )}
              onClick={() => setSelectedStore('all')}
            >
              All Stores
            </Button>
            {stores.map(store => (
              <Button
                key={store.id}
                variant={selectedStore === store.id ? 'default' : 'outline'}
                className={cn(
                  "rounded-2xl px-8 h-11 text-sm font-bold whitespace-nowrap transition-all",
                  selectedStore === store.id ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                )}
                onClick={() => setSelectedStore(store.id)}
              >
                {store.name}
              </Button>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-brand-50 text-brand-600 rounded-2xl group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                    <DollarSign size={28} />
                  </div>
                  <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100 rounded-xl px-3 py-1 font-bold">
                    <TrendingUp size={14} className="mr-1" /> +12.5%
                  </Badge>
                </div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Total Spend</p>
                <h3 className="text-4xl font-black text-zinc-900 mt-2 data-value tracking-tighter">
                  ${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                    <ShoppingCart size={28} />
                  </div>
                  <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100 rounded-xl px-3 py-1 font-bold">
                    <TrendingUp size={14} className="mr-1" /> +8.2%
                  </Badge>
                </div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Total Revenue</p>
                <h3 className="text-4xl font-black text-zinc-900 mt-2 data-value tracking-tighter">
                  ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                    <TrendingUp size={28} />
                  </div>
                  <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-100 rounded-xl px-3 py-1 font-bold">
                    <TrendingDown size={14} className="mr-1" /> -2.4%
                  </Badge>
                </div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Avg. ROAS</p>
                <h3 className="text-4xl font-black text-zinc-900 mt-2 data-value tracking-tighter">
                  {stats.avgRoas.toFixed(2)}<span className="text-zinc-400 text-2xl ml-1">x</span>
                </h3>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-zinc-950 text-white rounded-[32px] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-white/10 text-white rounded-2xl">
                    <CheckCircle2 size={28} />
                  </div>
                </div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Active Campaigns</p>
                <h3 className="text-4xl font-black text-white mt-2 data-value tracking-tighter">
                  {filteredReports.length}
                </h3>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Charts Section */}
            <div className="lg:col-span-2 space-y-10">
              <Card className="border-none shadow-sm bg-white rounded-[40px] p-4">
                <CardHeader className="flex flex-row items-center justify-between px-6 pt-6">
                  <div>
                    <CardTitle className="text-2xl font-black tracking-tight">Revenue vs Spend</CardTitle>
                    <CardDescription className="text-zinc-500 font-medium">Daily performance trend for selected stores.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="h-[400px] w-full mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#a1a1aa', fontWeight: 600 }}
                          dy={15}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fill: '#a1a1aa', fontWeight: 600 }}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ 
                            borderRadius: '24px', 
                            border: 'none', 
                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                            padding: '20px',
                            background: '#ffffff'
                          }} 
                        />
                        <Bar dataKey="revenue" fill="#3359f4" radius={[6, 6, 0, 0]} name="Revenue" barSize={32} />
                        <Bar dataKey="spend" fill="#e0e9fe" radius={[6, 6, 0, 0]} name="Spend" barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights Card */}
              <Card className="border-none shadow-sm bg-zinc-950 text-white rounded-[40px] overflow-hidden relative min-h-[400px] flex flex-col">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                  <Sparkles size={240} />
                </div>
                <CardHeader className="p-10 pb-0">
                  <div className="flex items-center gap-2 text-brand-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
                    <Sparkles size={16} />
                    <span>AI Performance Intelligence</span>
                  </div>
                  <CardTitle className="text-4xl font-black text-white tracking-tighter">Gemini Strategy Analysis</CardTitle>
                </CardHeader>
                <CardContent className="p-10 relative z-10 flex-1 flex flex-col">
                  {aiInsights ? (
                    <div className="prose prose-invert max-w-none">
                      <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-sm">
                        <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-lg font-medium">
                          {aiInsights}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="mt-8 border-white/20 text-white hover:bg-white/10 rounded-2xl h-12 px-8"
                        onClick={() => setAiInsights('')}
                      >
                        Clear Analysis
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-center space-y-8 py-10">
                      <div className="relative">
                        <div className="absolute inset-0 bg-brand-500 blur-[60px] opacity-20 animate-pulse"></div>
                        <div className="relative p-8 bg-white/5 rounded-full border border-white/10 backdrop-blur-xl">
                          <Sparkles className="text-brand-400" size={48} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-2xl font-black tracking-tight">Ready for deep analysis?</p>
                        <p className="text-zinc-400 text-lg max-w-md font-medium">
                          Let Gemini analyze your campaign data to find hidden opportunities and optimization strategies.
                        </p>
                      </div>
                      <Button 
                        onClick={generateInsights} 
                        disabled={isGeneratingInsights || filteredReports.length === 0}
                        className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-[20px] h-14 px-12 text-lg font-black shadow-2xl shadow-white/10 transition-all hover:scale-105 active:scale-95"
                      >
                        {isGeneratingInsights ? (
                          <>
                            <Loader2 className="mr-3 animate-spin" size={24} />
                            Analyzing Data...
                          </>
                        ) : (
                          'Generate AI Insights'
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Section */}
            <div className="space-y-10">
              <Card className="border-none shadow-sm bg-white rounded-[40px] p-4">
                <CardHeader className="px-6 pt-6">
                  <CardTitle className="text-2xl font-black tracking-tight">Store Distribution</CardTitle>
                  <CardDescription className="text-zinc-500 font-medium">Revenue share by store.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="h-[280px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-8 space-y-3">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="text-sm font-bold text-zinc-600 group-hover:text-zinc-900 transition-colors">{entry.name}</span>
                        </div>
                        <span className="font-black text-zinc-900 data-value text-sm">${entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-[40px] p-4">
                <CardHeader className="px-6 pt-6">
                  <CardTitle className="text-2xl font-black tracking-tight">Recent Activity</CardTitle>
                  <CardDescription className="text-zinc-500 font-medium">Latest campaign reports.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="mt-4 space-y-1">
                    {filteredReports.slice(0, 6).map((report) => (
                      <div key={report.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-all group cursor-default">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-zinc-900 group-hover:text-brand-600 transition-colors">{report.campaignName}</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{format(parseISO(report.campaignDate), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-zinc-900 data-value">${report.revenue.toLocaleString()}</p>
                          <Badge variant="outline" className="text-[10px] font-black py-0 h-5 border-zinc-200 text-zinc-500 rounded-lg">
                            {report.roas.toFixed(1)}x
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {filteredReports.length === 0 && (
                      <div className="p-12 text-center space-y-3">
                        <div className="inline-flex p-4 bg-zinc-50 rounded-full text-zinc-300">
                          <BarChart3 size={32} />
                        </div>
                        <p className="text-zinc-400 text-sm font-bold">No recent activity found.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card className="border-none shadow-sm bg-white rounded-[40px] overflow-hidden">
          <CardHeader className="p-10 pb-6 border-b border-zinc-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-black tracking-tight">Detailed Analytics</CardTitle>
                <CardDescription className="text-zinc-500 font-medium">Granular performance data for all active campaigns.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow className="hover:bg-transparent border-zinc-100">
                    <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Date</TableHead>
                    <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Campaign</TableHead>
                    <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Store</TableHead>
                    <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Spend</TableHead>
                    <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Revenue</TableHead>
                    <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">ROAS</TableHead>
                    <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-zinc-50/50 transition-colors border-zinc-100">
                      <TableCell className="px-10 py-8 text-sm font-bold text-zinc-500">
                        {format(parseISO(report.campaignDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="px-10 py-8">
                        <p className="font-black text-zinc-900 text-lg tracking-tight">{report.campaignName}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">ID: {report.id.slice(0, 8)}</p>
                      </TableCell>
                      <TableCell className="px-10 py-8">
                        <Badge variant="outline" className="rounded-xl border-zinc-200 bg-zinc-50 text-zinc-600 font-bold px-3 py-1">
                          {stores.find(s => s.id === report.storeId)?.name || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-10 py-8 text-right font-bold text-zinc-500 data-value">
                        ${report.totalSpend.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-10 py-8 text-right font-black text-zinc-900 text-lg data-value">
                        ${report.revenue.toLocaleString()}
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
                      <TableCell className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-20 h-2 bg-zinc-100 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                report.performanceScore > 80 ? "bg-emerald-500" : 
                                report.performanceScore > 50 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${report.performanceScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-black text-zinc-900">{Math.round(report.performanceScore)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Missing imports for Table components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
