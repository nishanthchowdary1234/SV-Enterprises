import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/types/supabase';

type Product = Database['public']['Tables']['products']['Row'] & {
    category: { name: string } | null;
};

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts(retryCount = 0) {
        setLoading(true);
        console.log(`Fetching products... (Attempt ${retryCount + 1})`);

        try {
            // 15 second timeout for retry
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 15000)
            );

            const queryPromise = supabase
                .from('products')
                .select('*, category:categories(name)')
                .order('created_at', { ascending: false });

            const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

            console.log('Products fetch result:', { data, error });

            if (error) {
                console.error('Error fetching products:', error);
                throw error;
            } else {
                // @ts-ignore - Supabase types join issue
                setProducts(data || []);
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Exception fetching products:', err);

            if (err.message === 'Timeout' && retryCount < 3) {
                console.log(`Request timed out, retrying... (${retryCount + 1}/3)`);
                await fetchProducts(retryCount + 1);
                return;
            }

            toast({
                variant: "destructive",
                title: "Error",
                description: err.message === 'Timeout' ? 'Request timed out after multiple retries' : (err.message || "An unexpected error occurred"),
            });
            setLoading(false);
        }
    }

    async function deleteProduct(id: string) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) {
            toast({
                variant: "destructive",
                title: "Error deleting product",
                description: error.message,
            });
        } else {
            toast({
                title: "Product deleted",
                description: "The product has been removed successfully.",
            });
            fetchProducts();
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
                <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link to="/admin/categories/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Category
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link to="/admin/products/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-white dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Image</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No products found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.title}
                                                className="h-10 w-10 rounded-md object-cover"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-700" />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{product.title}</TableCell>
                                    <TableCell>{product.category?.name || '-'}</TableCell>
                                    <TableCell>₹{product.price}</TableCell>
                                    <TableCell>{product.stock_quantity}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link to={`/admin/products/${product.id}/edit`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => deleteProduct(product.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
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
