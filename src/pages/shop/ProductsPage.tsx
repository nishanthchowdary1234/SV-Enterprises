import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, Search, Minus, Plus } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useToast } from '@/hooks/use-toast';

type Product = Database['public']['Tables']['products']['Row'] & {
    category: { name: string } | null;
};

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [priceRange, setPriceRange] = useState([0, 1000]);
    const [sort, setSort] = useState('newest');
    const { addItem, items, updateQuantity } = useCartStore();
    const { toast } = useToast();

    useEffect(() => {
        fetchProducts();

        const channel = supabase
            .channel('products-page-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                () => {
                    fetchProducts(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [searchParams]);

    async function fetchProducts(isBackground = false) {
        if (!isBackground) setLoading(true);
        const category = searchParams.get('category');

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                attempts++;
                // 15 second timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 15000)
                );

                let query = supabase
                    .from('products')
                    .select(`*, category:categories${category ? '!inner' : ''}(name)`)
                    .order('created_at', { ascending: false });

                const searchQuery = searchParams.get('q');
                if (searchQuery) {
                    query = query.ilike('title', `%${searchQuery}%`);
                }

                if (category) {
                    query = query.eq('category.name', category);
                }

                const { data, error } = await Promise.race([
                    query,
                    timeoutPromise
                ]) as any;

                if (error) throw error;

                // @ts-ignore
                setProducts(data || []);
                break; // Success, exit loop
            } catch (error) {
                console.error(`Attempt ${attempts} failed:`, error);
                if (attempts === maxAttempts) {
                    if (!isBackground) {
                        toast({
                            variant: "destructive",
                            title: "Error loading products",
                            description: "Please check your connection and try again.",
                        });
                    }
                } else {
                    // Wait before retrying (exponential backoff: 1s, 2s)
                    await new Promise(resolve => setTimeout(resolve, attempts * 1000));
                }
            }
        }

        if (!isBackground) setLoading(false);
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        setSearchParams(prev => {
            if (search) prev.set('q', search);
            else prev.delete('q');
            return prev;
        });
    }

    return (
        <div className="container py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 space-y-6">
                    <div>
                        <h3 className="font-semibold mb-4">Search</h3>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <Input
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <Button type="submit" size="icon">
                                <Search className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4">Price Range</h3>
                        <Slider
                            defaultValue={[0, 1000]}
                            max={1000}
                            step={1}
                            value={priceRange}
                            onValueChange={setPriceRange}
                        />
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4">Sort By</h3>
                        <Select value={sort} onValueChange={setSort}>
                            <SelectTrigger>
                                <SelectValue placeholder="Newest" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest</SelectItem>
                                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </aside>

                {/* Product Grid */}
                <div className="flex-1">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold">All Products</h1>
                        <p className="text-gray-500">{products.length} results</p>
                    </div>

                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No products found matching your criteria.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product) => (
                                <div key={product.id} className="group bg-white dark:bg-gray-800 rounded-lg border overflow-hidden transition-shadow hover:shadow-lg">
                                    <Link to={`/products/${product.slug}`} className="block aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.title}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                No Image
                                            </div>
                                        )}
                                    </Link>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-500 mb-1">{product.category?.name}</p>
                                        <Link to={`/products/${product.slug}`}>
                                            <h3 className="font-semibold mb-2 hover:text-primary transition-colors line-clamp-1">
                                                {product.title}
                                            </h3>
                                        </Link>
                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-lg font-bold">₹{product.price}</span>
                                            {(() => {
                                                const cartItem = items.find(item => item.id === product.id);
                                                return cartItem ? (
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <span className="w-4 text-center text-sm font-medium">
                                                            {cartItem.quantity}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            addItem(product);
                                                            toast({ title: "Added to cart", description: `${product.title} added to your cart.` });
                                                        }}
                                                    >
                                                        Add to Cart
                                                    </Button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}
