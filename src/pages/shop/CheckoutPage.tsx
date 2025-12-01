import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, Wallet, Banknote, MapPin } from 'lucide-react';

const formSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    postalCode: z.string().min(4, "Postal code is required"),
    country: z.string().min(2, "Country is required"),
});

export default function CheckoutPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { items, total, clearCart } = useCartStore();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [savedAddress, setSavedAddress] = useState<any>(null);
    const [addressMode, setAddressMode] = useState<'saved' | 'new'>('new');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            address: "",
            city: "",
            postalCode: "",
            country: "",
        },
    });

    useEffect(() => {
        if (user) {
            fetchSavedAddress();
        }
    }, [user]);

    async function fetchSavedAddress() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user?.id)
            .single();

        if (!error && data && data.address) {
            setSavedAddress(data);
            setAddressMode('saved');
            fillFormWithSavedAddress(data);
        }
    }

    function fillFormWithSavedAddress(data: any) {
        form.setValue('fullName', data.full_name || '');
        form.setValue('address', data.address || '');
        form.setValue('city', data.city || '');
        form.setValue('postalCode', data.zip || '');
        form.setValue('country', data.country || '');
    }

    function handleAddressModeChange(value: 'saved' | 'new') {
        setAddressMode(value);
        if (value === 'saved' && savedAddress) {
            fillFormWithSavedAddress(savedAddress);
        } else {
            form.reset({
                fullName: "",
                address: "",
                city: "",
                postalCode: "",
                country: "",
            });
        }
    }

    if (items.length === 0) {
        return (
            <div className="container py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
                <Button onClick={() => navigate('/products')}>Start Shopping</Button>
            </div>
        );
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user) {
            toast({
                variant: "destructive",
                title: "Authentication required",
                description: "Please log in to place an order.",
            });
            navigate('/login');
            return;
        }

        setLoading(true);

        try {
            // Simulate Payment Processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 1. Create Order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([
                    {
                        user_id: user.id,
                        total_amount: total(),
                        status: 'pending', // Default to pending for COD
                        shipping_address: {
                            fullName: values.fullName,
                            address: values.address,
                            city: values.city,
                            postalCode: values.postalCode,
                            country: values.country,
                        },
                    },
                ])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const orderItems = items.map((item) => ({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                price_at_purchase: item.price,
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // 3. Clear Cart & Redirect
            clearCart();
            toast({
                title: "Order Placed Successfully!",
                description: `Order #${order.id.slice(0, 8)} has been placed. Please pay cash on delivery.`,
            });
            navigate('/orders');

        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error placing order",
                description: error.message || "Something went wrong. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Checkout</h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Order Summary */}
                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg h-fit order-2 md:order-1">
                    <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                    <div className="space-y-4 mb-4">
                        {items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                                <span>
                                    {item.quantity}x {item.title}
                                </span>
                                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t pt-4 flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>₹{total().toFixed(2)}</span>
                    </div>
                </div>

                {/* Checkout Form */}
                <div className="order-1 md:order-2">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* Shipping Details */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">Shipping Information</h2>

                                {savedAddress && (
                                    <RadioGroup
                                        defaultValue="saved"
                                        value={addressMode}
                                        onValueChange={(v) => handleAddressModeChange(v as 'saved' | 'new')}
                                        className="mb-6"
                                    >
                                        <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                                            <RadioGroupItem value="saved" id="saved" />
                                            <Label htmlFor="saved" className="flex-1 cursor-pointer">
                                                <div className="font-medium flex items-center gap-2">
                                                    <MapPin className="h-4 w-4" />
                                                    Use Saved Address
                                                </div>
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    {savedAddress.address}, {savedAddress.city}, {savedAddress.zip}
                                                </div>
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                                            <RadioGroupItem value="new" id="new" />
                                            <Label htmlFor="new" className="flex-1 cursor-pointer font-medium">
                                                Enter New Address
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                )}

                                <FormField
                                    control={form.control}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123 Main St" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="New York" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="postalCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Postal Code</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="10001" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <FormControl>
                                                <Input placeholder="United States" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">Payment Method</h2>
                                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center gap-3">
                                    <Banknote className="h-5 w-5 text-primary" />
                                    <span className="font-medium">Cash on Delivery (COD)</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Pay with cash when your order arrives.
                                </p>
                            </div>

                            <Button type="submit" className="w-full mt-8 text-lg py-6" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Placing Order...
                                    </>
                                ) : (
                                    `Place Order - ₹${total().toFixed(2)}`
                                )}
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    );
}
