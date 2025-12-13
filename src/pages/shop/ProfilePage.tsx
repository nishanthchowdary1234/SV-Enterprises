import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, User as UserIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
    const { user } = useAuthStore();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [updating, setUpdating] = useState(false);
    const { toast } = useToast();

    // Form states
    const [fullName, setFullName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zip, setZip] = useState('');
    const [country, setCountry] = useState('');

    useEffect(() => {
        if (user) {
            fetchProfileData();
        }
    }, [user]);

    async function fetchProfileData() {
        setLoading(true);
        try {
            // Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);
            setFullName(profileData.full_name || '');
            setAddress(profileData.address || '');
            setCity(profileData.city || '');
            setState(profileData.state || '');
            setZip(profileData.zip || '');
            setCountry(profileData.country || '');

            // Fetch Orders
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;
            setOrders(ordersData || []);

        } catch (error: any) {
            console.error('Error fetching profile:', error);
            // Don't show toast for profile not found if it's a new user, just let them create it
        } finally {
            setLoading(false);
        }
    }

    async function updateProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;

        setUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    email: user.email, // Ensure email is kept in sync
                    address,
                    city,
                    state,
                    zip,
                    country,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            toast({
                title: "Profile updated",
                description: "Your profile information has been saved.",
            });
            fetchProfileData(); // Refresh data
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error updating profile",
                description: error.message,
            });
        } finally {
            setUpdating(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const defaultTab = searchParams.get('tab') || 'overview';

    return (
        <div className="container py-10 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">My Account</h1>

            <Tabs defaultValue={defaultTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Orders
                                </CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{orders.length}</div>
                                <p className="text-xs text-muted-foreground">
                                    Lifetime orders placed
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Account Status
                                </CardTitle>
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold capitalize">{profile?.role || 'Customer'}</div>
                                <p className="text-xs text-muted-foreground">
                                    Member since {new Date(user?.created_at || '').toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Orders</CardTitle>
                            <CardDescription>
                                Your recent purchases from our store.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {orders.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No orders yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {orders.slice(0, 3).map((order) => (
                                        <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize
                                                    ${order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                        order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link to={`/orders/${order.id}`}>View</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {orders.length > 3 && (
                                <div className="mt-4 pt-4 border-t">
                                    <Button variant="link" className="px-0" asChild>
                                        <Link to="/orders">View all orders</Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order History</CardTitle>
                            <CardDescription>
                                View and track all your past orders.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {orders.length === 0 ? (
                                <div className="text-center py-8">
                                    <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                                    <h3 className="text-lg font-medium">No orders yet</h3>
                                    <p className="text-muted-foreground mb-4">Start shopping to see your orders here.</p>
                                    <Button asChild>
                                        <Link to="/products">Browse Products</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map((order) => (
                                        <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold">#{order.id.slice(0, 8)}</span>
                                                    <span className="text-muted-foreground">•</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm">
                                                    Total: <span className="font-medium">₹{order.total_amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize
                                                    ${order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                        order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link to={`/orders/${order.id}`}>Details</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Settings</CardTitle>
                            <CardDescription>
                                Update your personal information.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={updateProfile} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" value={user?.email || ''} disabled />
                                    <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="123 Main St"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="City"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            placeholder="State"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="zip">ZIP / Postal Code</Label>
                                        <Input
                                            id="zip"
                                            value={zip}
                                            onChange={(e) => setZip(e.target.value)}
                                            placeholder="ZIP Code"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            placeholder="Country"
                                        />
                                    </div>
                                </div>

                                <Button type="submit" disabled={updating}>
                                    {updating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
