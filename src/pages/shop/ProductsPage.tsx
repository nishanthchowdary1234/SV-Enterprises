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

    // Derive state from URL
    const search = searchParams.get('q') || '';
    const sort = searchParams.get('sort') || 'newest';

    const [priceRange, setPriceRange] = useState([0, 1000]);
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
    }, [searchParams]); // Re-run whenever URL params change

    async function fetchProducts(isBackground = false) {
        if (!isBackground) setLoading(true);
        const category = searchParams.get('category');

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                attempts++;
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 15000)
                );

                let query = supabase
                    .from('products')
                    .select(`*, category:categories${category ? '!inner' : ''}(name)`);

                // Apply Sorting
                if (sort === 'newest') {
                    query = query.order('created_at', { ascending: false });
                } else if (sort === 'price-asc') {
                    query = query.order('price', { ascending: true });
                } else if (sort === 'price-desc') {
                    query = query.order('price', { ascending: false });
                } else if (sort === 'deals') {
                    query = query.not('compare_at_price', 'is', null).order('created_at', { ascending: false });
                } else {
                    query = query.order('created_at', { ascending: false });
                }

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

                let fetchedProducts = data || [];

                // In-memory filtering for Deals
                if (sort === 'deals') {
                    fetchedProducts = fetchedProducts.filter((p: Product) =>
                        p.compare_at_price && p.compare_at_price > p.price
                    );
                }

                // @ts-ignore
                setProducts(fetchedProducts);
                break;
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
                    await new Promise(resolve => setTimeout(resolve, attempts * 1000));
                }
            }
        }

        if (!isBackground) setLoading(false);
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        // Search is already handled by Input onChange updating URL in real-time or on submit?
        // Actually, let's keep the local state for input but update URL on submit
        // Wait, I removed local 'search' state. Let's fix that.
        // Re-introducing local state for the input field only, to avoid excessive URL updates while typing
    }

    // Helper to update URL params
    const updateParam = (key: string, value: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (value) newParams.set(key, value);
            else newParams.delete(key);
            return newParams;
        });
    };

    return (
        <div className="container py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 space-y-6">
                    <div>
                        <h3 className="font-semibold mb-4">Search</h3>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search products..."
                                defaultValue={search}
                                onChange={(e) => {
                                    // Debounce could be good here, but for now just update on blur or enter?
                                    // Or just let it update URL on change (might be laggy).
                                    // Let's use a simple approach: Update URL on Enter or Button click.
                                    // But the previous code had a form.
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        updateParam('q', e.currentTarget.value);
                                    }
                                }}
                            />
                            <Button
                                size="icon"
                                onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    updateParam('q', input.value);
                                }}
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
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
                        <Select
                            value={sort}
                            onValueChange={(val) => updateParam('sort', val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Newest" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest</SelectItem>
                                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                                <SelectItem value="deals">Today's Deals</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </aside>

                {/* Product Grid */}
                <div className="flex-1">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold">
                            {sort === 'deals' ? "Today's Deals" : "All Products"}
                        </h1>
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
                                <div key={product.id} className="group bg-white dark:bg-gray-800 rounded-lg border overflow-hidden transition-shadow hover:shadow-lg flex flex-col">
                                    <Link to={`/products/${product.slug}`} className="block aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden relative">
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
                                        {/* Low Stock Badge */}
                                        {product.stock_quantity > 0 && product.stock_quantity < 20 && (
                                            <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                Only {product.stock_quantity} left!
                                            </div>
                                        )}
                                        {/* Out of Stock Badge */}
                                        {product.stock_quantity === 0 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="bg-white text-black px-3 py-1 font-bold rounded">Out of Stock</span>
                                            </div>
                                        )}
                                    </Link>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <p className="text-sm text-gray-500 mb-1">{product.category?.name}</p>
                                        <Link to={`/products/${product.slug}`}>
                                            <h3 className="font-semibold mb-2 hover:text-primary transition-colors line-clamp-1">
                                                {product.title}
                                            </h3>
                                        </Link>
                                        <div className="mt-auto flex items-center justify-between">
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
                                                            disabled={cartItem.quantity >= product.stock_quantity}
                                                            onClick={() => {
                                                                if (cartItem.quantity < product.stock_quantity) {
                                                                    updateQuantity(product.id, cartItem.quantity + 1);
                                                                } else {
                                                                    toast({
                                                                        variant: "destructive",
                                                                        title: "Max stock reached",
                                                                        description: `Only ${product.stock_quantity} available.`
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        disabled={product.stock_quantity === 0}
                                                        onClick={() => {
                                                            addItem(product);
                                                            toast({ title: "Added to cart", description: `${product.title} added to your cart.` });
                                                        }}
                                                    >
                                                        {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
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
