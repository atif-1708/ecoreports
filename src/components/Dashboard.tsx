import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, CampaignReport, Store } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { getCampaignInsights } from '@/lib/gemini';
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

interface DashboardProps {
  user: UserProfile;
}

export default function Dashboard({ user }: DashboardProps) {
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user, selectedStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stores for filter
      let storesQuery = supabase.from('stores').select('*');
      if (user.role !== 'admin') {
        storesQuery = storesQuery.eq('id', user.storeId);
      }
      
      const { data: storesData, error: storesError } = await storesQuery;
      if (storesError) throw storesError;
      setStores(storesData as Store[]);

      // Fetch reports
      let reportsQuery = supabase
        .from('reports')
        .select('*')
        .order('campaignDate', { ascending: false });

      if (user.role === 'admin') {
        if (selectedStore !== 'all') {
          reportsQuery = reportsQuery.eq('storeId', selectedStore);
        } else {
          reportsQuery = reportsQuery.limit(100);
        }
      } else {
        reportsQuery = reportsQuery.eq('storeId', user.storeId);
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

  const generateInsights = async () => {
    if (reports.length === 0) return;
    setIsGeneratingInsights(true);
    const insights = await getCampaignInsights(reports.slice(0, 10));
    setAiInsights(insights);
    setIsGeneratingInsights(false);
  };

  // Aggregations
  const totalSpend = reports.reduce((acc, curr) => acc + curr.totalSpend, 0);
  const totalConfirmed = reports.reduce((acc, curr) => acc + curr.confirmed, 0);
  const totalCanceled = reports.reduce((acc, curr) => acc + curr.canceled, 0);
  const totalOrders = reports.reduce((acc, curr) => acc + curr.purchases, 0);
  const avgCancellationRate = totalOrders > 0 ? (totalCanceled / totalOrders) * 100 : 0;
  const avgConfirmationRate = totalOrders > 0 ? (totalConfirmed / totalOrders) * 100 : 0;

  // Chart Data: Spend over time
  const chartData = reports
    .slice()
    .reverse()
    .reduce((acc: any[], curr) => {
      const date = format(parseISO(curr.campaignDate), 'MMM dd');
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.spend += curr.totalSpend;
        existing.confirmed += curr.confirmed;
      } else {
        acc.push({ date, spend: curr.totalSpend, confirmed: curr.confirmed });
      }
      return acc;
    }, [])
    .slice(-7);

  const COLORS = ['#18181b', '#71717a', '#d4d4d8', '#f4f4f5'];

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading analytics...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Performance Overview</h1>
          <p className="text-zinc-500">Track and analyze your agency's campaign effectiveness.</p>
        </div>
        
        {user.role === 'admin' && (
          <select 
            className="bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="all">All Stores</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Ad Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpend.toLocaleString()}</div>
            <p className="text-xs text-zinc-400 mt-1">Across {reports.length} reports</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Confirmed Orders</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConfirmed.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-medium text-emerald-600">{avgConfirmationRate.toFixed(1)}%</span>
              <span className="text-xs text-zinc-400">confirmation rate</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Canceled Orders</CardTitle>
            <XCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCanceled.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-medium text-rose-600">{avgCancellationRate.toFixed(1)}%</span>
              <span className="text-xs text-zinc-400">cancellation rate</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Net Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalConfirmed - totalCanceled).toLocaleString()}</div>
            <p className="text-xs text-zinc-400 mt-1">Net confirmed orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Spend vs. Conversions</CardTitle>
            <CardDescription>Daily performance trend over the last 7 active days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#71717a' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#71717a' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="spend" fill="#18181b" radius={[4, 4, 0, 0]} name="Spend ($)" />
                <Bar dataKey="confirmed" fill="#10b981" radius={[4, 4, 0, 0]} name="Confirmed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="border-none shadow-sm bg-zinc-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-amber-400" size={20} />
              AI Insights
            </CardTitle>
            <CardDescription className="text-zinc-400">Automated campaign analysis & suggestions.</CardDescription>
          </CardHeader>
          <CardContent>
            {aiInsights ? (
              <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
                {aiInsights.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4 bg-transparent border-zinc-700 hover:bg-zinc-800 text-white"
                  onClick={generateInsights}
                  disabled={isGeneratingInsights}
                >
                  {isGeneratingInsights ? 'Analyzing...' : 'Refresh Insights'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center space-y-4">
                <p className="text-zinc-400 text-sm">Generate AI-powered insights based on your latest campaign data.</p>
                <Button 
                  onClick={generateInsights} 
                  disabled={isGeneratingInsights || reports.length === 0}
                  className="bg-white text-zinc-900 hover:bg-zinc-200"
                >
                  {isGeneratingInsights ? 'Analyzing...' : 'Generate Insights'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports Table */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Campaign Reports</CardTitle>
            <CardDescription>The latest performance data submitted by your team.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-4">Date</TableHead>
                <TableHead className="px-6 py-4">Campaign</TableHead>
                <TableHead className="px-6 py-4">Employee</TableHead>
                <TableHead className="px-6 py-4 text-right">Spend</TableHead>
                <TableHead className="px-6 py-4 text-right">Confirmed</TableHead>
                <TableHead className="px-6 py-4 text-right">Canceled</TableHead>
                <TableHead className="px-6 py-4 text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.slice(0, 10).map((report) => (
                <TableRow key={report.id} className="hover:bg-zinc-50 transition-colors">
                  <TableCell className="px-6 py-4 font-medium text-zinc-900">
                    {format(parseISO(report.campaignDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-zinc-600">{report.campaignName}</TableCell>
                  <TableCell className="px-6 py-4 text-zinc-600">{report.employeeName}</TableCell>
                  <TableCell className="px-6 py-4 text-right font-mono text-zinc-900">
                    ${report.totalSpend.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right text-emerald-600 font-medium">
                    {report.confirmed}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right text-rose-600 font-medium">
                    {report.canceled}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Badge 
                      variant={
                        report.performanceScore >= 80 ? 'default' :
                        report.performanceScore >= 50 ? 'secondary' :
                        'destructive'
                      }
                      className="text-[10px] font-bold uppercase"
                    >
                      {report.performanceScore.toFixed(0)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                    No reports found. Start by submitting a weekly report.
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
