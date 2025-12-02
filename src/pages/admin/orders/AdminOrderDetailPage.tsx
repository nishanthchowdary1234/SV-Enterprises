import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Package, MapPin } from 'lucide-react';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'] & {
    product: Database['public']['Tables']['products']['Row'] | null;
};

export default function AdminOrderDetailPage() {
    const { id } = useParams();
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (id) fetchOrderDetails();
    }, [id]);

    async function fetchOrderDetails(retryCount = 0) {
        try {
            setLoading(true);

            // 15 second timeout for retry
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 15000)
            );

            // Fetch Order
            const orderPromise = supabase
                .from('orders')
                .select('*')
                .eq('id', id)
                .single();

            // Fetch Items
            const itemsPromise = supabase
                .from('order_items')
                .select('*, product:products(*)')
                .eq('order_id', id);

            // Execute both requests in parallel with timeout
            const [orderResult, itemsResult] = await Promise.race([
                Promise.all([orderPromise, itemsPromise]),
                timeoutPromise
            ]) as [any, any];

            const { data: orderData, error: orderError } = orderResult;
            const { data: itemsData, error: itemsError } = itemsResult;

            if (orderError) throw orderError;

            setOrder(orderData);

            if (itemsError) {
                console.error('Error fetching items:', itemsError);
            } else {
                // @ts-ignore
                setItems(itemsData || []);
            }
            setLoading(false);
        } catch (error: any) {
            console.error('Error fetching order details:', error);

            if (error.message === 'Timeout' && retryCount < 3) {
                console.log(`Request timed out, retrying... (${retryCount + 1}/3)`);
                await fetchOrderDetails(retryCount + 1);
                return;
            }

            toast({
                variant: "destructive",
                title: "Error fetching order",
                description: error.message === 'Timeout' ? 'Request timed out after multiple retries' : error.message,
            });
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Order not found</h1>
                <Button asChild>
                    <Link to="/admin/orders">Back to Orders</Link>
                </Button>
            </div>
        );
    }

    const shippingAddress = order.shipping_address_id
        ? (order.shipping_address_id as any) // If it was a relation
        : (order as any).shipping_address; // If it's stored as JSON (which we did in CheckoutPage)

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/admin/orders">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Order #{order.id.slice(0, 8)}</h1>
                    <p className="text-gray-500">
                        Placed on {new Date(order.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="ml-auto">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize
            ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                order.status === 'returned' ? 'bg-orange-100 text-orange-800' :
                                    'bg-yellow-100 text-yellow-800'}`}>
                        {order.status}
                    </span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Order Items */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                                        <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden">
                                            {item.product?.image_url && (
                                                <img
                                                    src={item.product.image_url}
                                                    alt={item.product.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium">{item.product?.title || 'Unknown Product'}</h3>
                                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                        </div>
                                        <div className="font-medium">
                                            ₹{item.price_at_purchase.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-4 border-t flex justify-between items-center font-bold text-lg">
                                <span>Total</span>
                                <span>₹{order.total_amount.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Customer & Shipping Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Shipping Address
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {shippingAddress ? (
                                <div className="text-sm space-y-1">
                                    <p className="font-medium">{shippingAddress.fullName}</p>
                                    <p>{shippingAddress.address}</p>
                                    <p>{shippingAddress.city}, {shippingAddress.postalCode}</p>
                                    <p>{shippingAddress.country}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No shipping address provided.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
