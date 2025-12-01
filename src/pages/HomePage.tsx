import { useEffect, useState } from 'react';
import HeroSection from '@/components/home/HeroSection';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { useCartStore } from '@/store/useCartStore';
import { useToast } from '@/hooks/use-toast';

type Category = Database['public']['Tables']['categories']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

export default function HomePage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
    const { addItem } = useCartStore();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHomeData();

        // Realtime subscriptions
        const categoriesChannel = supabase
            .channel('home-categories-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchHomeData(true))
            .subscribe();

        const productsChannel = supabase
            .channel('home-products-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchHomeData(true))
            .subscribe();

        return () => {
            supabase.removeChannel(categoriesChannel);
            supabase.removeChannel(productsChannel);
        };
    }, []);

    async function fetchHomeData(isBackground = false) {
        if (!isBackground) setLoading(true);

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                attempts++;
                // 15 second timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 15000)
                );

                const fetchDataPromise = (async () => {
                    // Fetch Categories
                    const { data: categoriesData, error: catError } = await supabase
                        .from('categories')
                        .select('*')
                        .limit(3);

                    if (catError) throw catError;

                    // Fetch Trending Products
                    const { data: trendingData, error: trendError } = await supabase
                        .rpc('get_trending_products', { limit_count: 4 });

                    let finalTrending = trendingData;

                    if (trendError || !trendingData || trendingData.length === 0) {
                        // Fallback
                        const { data: fallbackData, error: fallbackError } = await supabase
                            .from('products')
                            .select('*')
                            .limit(4);

                        if (fallbackError) throw fallbackError;
                        finalTrending = fallbackData;
                    }

                    return { categories: categoriesData, trending: finalTrending };
                })();

                const result = await Promise.race([
                    fetchDataPromise,
                    timeoutPromise
                ]) as { categories: Category[], trending: Product[] };

                setCategories(result.categories || []);
                setTrendingProducts(result.trending || []);
                break; // Success

            } catch (error) {
                console.error(`Attempt ${attempts} failed:`, error);
                if (attempts === maxAttempts) {
                    if (!isBackground) {
                        toast({
                            variant: "destructive",
                            title: "Error loading data",
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

    const handleAddToCart = (product: Product) => {
        addItem(product);
        toast({
            title: "Added to cart",
            description: `${product.title} has been added to your cart.`,
        });
    };

    return (
        <div className="flex flex-col min-h-screen">
            <HeroSection />

            {/* Featured Categories Preview */}
            <section className="py-16 container">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold">Featured Collections</h2>
                    <Button variant="ghost" asChild>
                        <Link to="/categories">
                            View All <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? (
                        // Loading Skeletons for Categories
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                        ))
                    ) : categories.length === 0 ? (
                        <p className="text-muted-foreground col-span-3 text-center">No categories found.</p>
                    ) : (
                        categories.map((category) => (
                            <Link key={category.id} to={`/products?category=${category.name}`} className="group relative overflow-hidden rounded-lg aspect-video bg-gray-100 dark:bg-gray-800 hover:opacity-90 transition-opacity">
                                {category.image_url ? (
                                    <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                                        <span className="text-xl font-semibold">{category.name}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                    <span className="text-xl font-semibold text-white drop-shadow-md">{category.name}</span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </section>

            {/* Featured Products Preview */}
            <section className="py-16 bg-gray-50 dark:bg-gray-900">
                <div className="container">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-bold">Trending Now</h2>
                        <Button variant="ghost" asChild>
                            <Link to="/products">
                                Shop All <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        {loading ? (
                            // Loading Skeletons for Products
                            Array(4).fill(0).map((_, i) => (
                                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden h-[300px] animate-pulse">
                                    <div className="h-[200px] bg-gray-200 dark:bg-gray-700" />
                                    <div className="p-4 space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                    </div>
                                </div>
                            ))
                        ) : trendingProducts.length === 0 ? (
                            <p className="text-muted-foreground col-span-4 text-center">No products found.</p>
                        ) : (
                            trendingProducts.map((product) => (
                                <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col">
                                    <Link to={`/products/${product.slug}`} className="aspect-square bg-gray-200 dark:bg-gray-700 block overflow-hidden">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                                        )}
                                    </Link>
                                    <div className="p-4 flex flex-col flex-1">
                                        <Link to={`/products/${product.slug}`} className="font-semibold mb-1 hover:underline line-clamp-1" title={product.title}>
                                            {product.title}
                                        </Link>
                                        <div className="flex items-center justify-between mt-auto pt-4">
                                            <span className="font-bold">₹{product.price.toFixed(2)}</span>
                                            <Button size="sm" onClick={() => handleAddToCart(product)}>
                                                <ShoppingCart className="h-4 w-4 mr-2" />
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
