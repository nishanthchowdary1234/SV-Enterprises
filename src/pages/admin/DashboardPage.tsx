import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, Loader2, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CounterSaleDialog } from '@/components/admin/CounterSaleDialog';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

type Stats = {
    dailyRevenue: {
        total: number;
        online: number;
        counter: number;
    };
    revenue: number;
    orders: number;
    customers: number;
};

type Order = {
    id: string;
    total_amount: number;
    created_at: string;
    status: string;
    profiles: {
        full_name: string | null;
        email: string | null;
    } | null;
    shipping_address: {
        fullName: string;
    } | null;
};

type ChartData = {
    name: string;
    total: number;
};

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({
        dailyRevenue: { total: 0, online: 0, counter: 0 },
        revenue: 0,
        orders: 0,
        customers: 0
    });
    const [recentSales, setRecentSales] = useState<Order[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchDashboardData();

        const channel = supabase
            .channel('dashboard-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => {
                    fetchDashboardData(0, true);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'counter_sales' },
                () => {
                    fetchDashboardData(0, true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchDashboardData(retryCount = 0, isBackground = false) {
        try {
            if (!isBackground) setLoading(true);

            // 15 second timeout for retry
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 15000)
            );

            // 1. Fetch Stats
            const ordersPromise = supabase
                .from('orders')
                .select('total_amount, created_at, status');

            const customersPromise = supabase
                .from('profiles')
                .select('id', { count: 'exact' })
                .eq('role', 'customer');

            const dailyRevenuePromise = supabase
                .rpc('get_daily_revenue');

            const counterSalesPromise = supabase
                .from('counter_sales')
                .select('amount, sale_date');

            // 2. Fetch Recent Sales
            const recentSalesPromise = supabase
                .from('orders')
                .select('*, profiles(full_name, email)')
                .order('created_at', { ascending: false })
                .limit(5);

            const [ordersRes, customersRes, dailyRevenueRes, counterSalesRes, recentSalesRes] = await Promise.race([
                Promise.all([ordersPromise, customersPromise, dailyRevenuePromise, counterSalesPromise, recentSalesPromise]),
                timeoutPromise
            ]) as [any, any, any, any, any];

            // Handle errors individually instead of throwing
            if (ordersRes.error) console.error('Error fetching orders:', ordersRes.error);
            if (customersRes.error) console.error('Error fetching customers:', customersRes.error);
            if (dailyRevenueRes.error) console.error('Error fetching daily revenue:', dailyRevenueRes.error);
            if (counterSalesRes.error) console.error('Error fetching counter sales:', counterSalesRes.error);
            if (recentSalesRes.error) console.error('Error fetching recent sales:', recentSalesRes.error);

            // Calculate Total Online Revenue (excluding cancelled)
            const totalOnlineRevenue = ordersRes.data?.reduce((sum: number, order: any) => {
                if (order.status !== 'cancelled') {
                    return sum + Number(order.total_amount);
                }
                return sum;
            }, 0) || 0;

            // Calculate Total Counter Revenue
            const totalCounterRevenue = counterSalesRes.data?.reduce((sum: number, sale: any) => sum + Number(sale.amount), 0) || 0;

            // Total Revenue = Online + Counter
            const totalRevenue = totalOnlineRevenue + totalCounterRevenue;

            // Calculate Daily Online Revenue (Client-side to include 'pending' orders)
            const today = new Date().toISOString().split('T')[0];
            const dailyOnlineRevenue = ordersRes.data?.reduce((sum: number, order: any) => {
                const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                if (orderDate === today && order.status !== 'cancelled') {
                    return sum + Number(order.total_amount);
                }
                return sum;
            }, 0) || 0;

            const dailyData = dailyRevenueRes.data || { total: 0, online: 0, counter: 0 };
            // Ensure total is calculated correctly on client side to avoid RPC issues
            const dailyTotal = dailyOnlineRevenue + (Number(dailyData.counter) || 0);

            setStats({
                dailyRevenue: {
                    ...dailyData,
                    online: dailyOnlineRevenue,
                    total: dailyTotal
                },
                revenue: totalRevenue,
                orders: ordersRes.data?.length || 0,
                customers: customersRes.count || 0
            });

            setRecentSales(recentSalesRes.data || []);

            // Process Chart Data (Last 7 Days)
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const chartData = last7Days.map(date => {
                // Online Revenue for this date
                const online = ordersRes.data?.reduce((sum: number, order: any) => {
                    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                    if (orderDate === date && order.status !== 'cancelled') {
                        return sum + Number(order.total_amount);
                    }
                    return sum;
                }, 0) || 0;

                // Counter Revenue for this date
                const counter = counterSalesRes.data?.reduce((sum: number, sale: any) => {
                    if (sale.sale_date === date) {
                        return sum + Number(sale.amount);
                    }
                    return sum;
                }, 0) || 0;

                return {
                    name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    total: online + counter
                };
            });

            setChartData(chartData);
            if (!isBackground) setLoading(false);

        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);

            if (error.message === 'Timeout' && retryCount < 3) {
                console.log(`Request timed out, retrying... (${retryCount + 1}/3)`);
                await fetchDashboardData(retryCount + 1, isBackground);
                return;
            }

            if (!isBackground) {
                toast({
                    variant: "destructive",
                    title: "Error fetching dashboard data",
                    description: error.message === 'Timeout' ? 'Request timed out after multiple retries' : error.message,
                });
                setLoading(false);
            }
        }
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="gap-2">
                        <Link to="/admin/counter-sales">
                            <History className="h-4 w-4" />
                            History
                        </Link>
                    </Button>
                    <CounterSaleDialog onSuccess={fetchDashboardData} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.dailyRevenue?.total?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground">
                            Online: ₹{stats.dailyRevenue?.online || 0} | Counter: ₹{stats.dailyRevenue?.counter || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.revenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Lifetime revenue</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.orders}</div>
                        <p className="text-xs text-muted-foreground">Total orders placed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.customers}</div>
                        <p className="text-xs text-muted-foreground">Registered customers</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={chartData}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `₹${value}`}
                                />
                                <Tooltip
                                    formatter={(value: number) => [`₹${value}`, 'Revenue']}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Bar dataKey="total" fill="#dc2626" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {recentSales.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No recent sales.</p>
                            ) : (
                                recentSales.map((order) => (
                                    <div key={order.id} className="flex items-center">
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {order.profiles?.full_name || order.shipping_address?.fullName || 'Guest'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.profiles?.email || 'No email'}
                                            </p>
                                        </div>
                                        <div className="ml-auto font-medium">+₹{order.total_amount.toFixed(2)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
