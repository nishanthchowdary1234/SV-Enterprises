import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, ArrowDownToLine, Search } from 'lucide-react';

type Product = Database['public']['Tables']['products']['Row'];

export default function RestockPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [restockAmounts, setRestockAmounts] = useState<{ [key: string]: string }>({});
    const [updating, setUpdating] = useState<{ [key: string]: boolean }>({});
    const { toast } = useToast();

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('stock_quantity', { ascending: true }); // Low stock first

            if (error) throw error;
            setProducts(data || []);
        } catch (error: any) {
            console.error('Error fetching products:', error);
            toast({
                variant: "destructive",
                title: "Error fetching inventory",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }

    const filteredProducts = products.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAmountChange = (productId: string, value: string) => {
        // Only allow positive numbers
        if (parseInt(value) < 0) return;
        setRestockAmounts(prev => ({ ...prev, [productId]: value }));
    };

    async function handleRestock(product: Product) {
        const amountStr = restockAmounts[product.id];
        const amount = parseInt(amountStr);

        if (!amount || isNaN(amount) || amount <= 0) {
            toast({
                variant: "destructive",
                title: "Invalid amount",
                description: "Please enter a valid positive number to restock.",
            });
            return;
        }

        setUpdating(prev => ({ ...prev, [product.id]: true }));

        try {
            const newStock = product.stock_quantity + amount;

            const { error } = await supabase
                .from('products')
                .update({ stock_quantity: newStock })
                .eq('id', product.id);

            if (error) throw error;

            toast({
                title: "Stock updated",
                description: `Added ${amount} units to ${product.title}. New stock: ${newStock}`,
            });

            // Update local state
            setProducts(products.map(p =>
                p.id === product.id ? { ...p, stock_quantity: newStock } : p
            ));

            // Clear input
            setRestockAmounts(prev => ({ ...prev, [product.id]: '' }));

        } catch (error: any) {
            console.error('Error updating stock:', error);
            toast({
                variant: "destructive",
                title: "Update failed",
                description: error.message,
            });
        } finally {
            setUpdating(prev => ({ ...prev, [product.id]: false }));
        }
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ArrowDownToLine className="h-8 w-8" />
                        Restock Inventory
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage low stock items. Products are sorted by lowest stock quantity.
                    </p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Current Stock</TableHead>
                            <TableHead>Add Stock</TableHead>
                            <TableHead className="w-[150px]">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No products found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                                {product.image_url && (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <div className="font-medium">{product.title}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${product.stock_quantity === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                product.stock_quantity < 10 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            {product.stock_quantity} units
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder="Qty to add"
                                            value={restockAmounts[product.id] || ''}
                                            onChange={(e) => handleAmountChange(product.id, e.target.value)}
                                            className="w-32"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleRestock(product);
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            onClick={() => handleRestock(product)}
                                            disabled={updating[product.id] || !restockAmounts[product.id]}
                                            size="sm"
                                            className="w-full"
                                        >
                                            {updating[product.id] ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Plus className="h-4 w-4 mr-1" />
                                                    Add
                                                </>
                                            )}
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
