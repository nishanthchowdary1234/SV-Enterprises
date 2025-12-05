import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Customer = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
    total_orders: number;
    total_spent: number;
};

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers(retryCount = 0) {
        try {
            setLoading(true);

            // 15 second timeout for retry
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 15000)
            );

            // 1. Fetch profiles
            const profilesPromise = supabase
                .from('profiles')
                .select('*')
                .eq('role', 'customer');

            // 2. Fetch orders for aggregation
            const ordersPromise = supabase
                .from('orders')
                .select('user_id, total_amount');

            // Execute in parallel with timeout
            const [profilesResult, ordersResult] = await Promise.race([
                Promise.all([profilesPromise, ordersPromise]),
                timeoutPromise
            ]) as [any, any];

            const { data: profiles, error: profilesError } = profilesResult;
            const { data: orders, error: ordersError } = ordersResult;

            if (profilesError) throw profilesError;
            if (ordersError) console.error('Error fetching orders stats:', ordersError);

            // 3. Aggregate data
            const customersWithStats = (profiles || []).map((profile: any) => {
                const customerOrders = orders?.filter((o: any) => o.user_id === profile.id) || [];
                const totalSpent = customerOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

                return {
                    ...profile,
                    total_orders: customerOrders.length,
                    total_spent: totalSpent
                };
            });

            setCustomers(customersWithStats);
            setLoading(false);
        } catch (error: any) {
            console.error('Error fetching customers:', error);

            if (error.message === 'Timeout' && retryCount < 3) {
                console.log(`Request timed out, retrying... (${retryCount + 1}/3)`);
                await fetchCustomers(retryCount + 1);
                return;
            }

            toast({
                variant: "destructive",
                title: "Error fetching customers",
                description: error.message === 'Timeout' ? 'Request timed out after multiple retries' : error.message,
            });
            setLoading(false);
        }
    }

    async function handleDeleteCustomer(customerId: string) {
        if (!confirm('Are you sure you want to delete this customer? This action cannot be undone and will delete all their orders and data.')) {
            return;
        }

        try {
            const { error } = await supabase.rpc('delete_user', { target_user_id: customerId });

            if (error) throw error;

            toast({
                title: "Customer deleted",
                description: "The customer has been successfully removed.",
            });

            // Refresh list
            fetchCustomers();
        } catch (error: any) {
            console.error('Error deleting customer:', error);
            toast({
                variant: "destructive",
                title: "Error deleting customer",
                description: error.message,
            });
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
                <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            </div>

            <div className="rounded-md border bg-white dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead>Total Spent</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                    No customers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.full_name || 'N/A'}</TableCell>
                                    <TableCell>{customer.email || 'N/A'}</TableCell>
                                    <TableCell>{customer.total_orders}</TableCell>
                                    <TableCell>₹{customer.total_spent.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteCustomer(customer.id)}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
