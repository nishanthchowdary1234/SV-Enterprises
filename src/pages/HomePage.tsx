import { useEffect, useState } from 'react';
import HomeCarousel from '@/components/home/HomeCarousel';
import DealOfTheDay from '@/components/home/DealOfTheDay';
import CategoryGrid from '@/components/home/CategoryGrid';
import ProductRow from '@/components/home/ProductRow';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';

type Category = Database['public']['Tables']['categories']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

export default function HomePage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
    const [newArrivals, setNewArrivals] = useState<Product[]>([]);
    const { toast } = useToast();
    useEffect(() => {
        fetchHomeData();
    }, []);

    async function fetchHomeData() {
        try {
            // Fetch Categories
            const { data: categoriesData } = await supabase
                .from('categories')
                .select('*')
                .limit(8); // Fetch more for grids

            // Fetch Trending Products
            const { data: trendingData } = await supabase
                .from('products')
                .select('*')
                .limit(10); // Fetch more for scroll

            // Fetch New Arrivals (mocked by just taking another slice or random for now)
            const { data: newData } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            setCategories(categoriesData || []);
            setTrendingProducts(trendingData || []);
            setNewArrivals(newData || []);

        } catch (error) {
            console.error('Error loading home data:', error);
            toast({
                variant: "destructive",
                title: "Error loading data",
                description: "Please check your connection and try again.",
            });
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 pb-8">
            {/* Hero Carousel */}
            <HomeCarousel />

            {/* Content Container - Overlapping Carousel slightly */}
            <div className="container relative z-10 -mt-20 md:-mt-32 px-4">
                {/* Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Card 1: Shop by Category */}
                    <CategoryGrid
                        title="Shop by Category"
                        categories={categories.slice(0, 4)}
                    />

                    {/* Card 2: Industrial Supplies */}
                    <CategoryGrid
                        title="Industrial Supplies"
                        categories={categories.slice(4, 8).length > 0 ? categories.slice(4, 8) : categories.slice(0, 4)}
                    />

                    {/* Card 3: Deal of the Day */}
                    <DealOfTheDay />
                </div>

                {/* Trending Products Row */}
                <div className="mb-8">
                    <ProductRow title="Trending Now" products={trendingProducts} link="/products" />
                </div>

                {/* New Arrivals Row */}
                <div className="mb-8">
                    <ProductRow title="New Arrivals" products={newArrivals} link="/products?sort=newest" />
                </div>

                {/* Another Product Row (Best Sellers - Mocked with same data for now) */}
                <div className="mb-8">
                    <ProductRow title="Best Sellers in Plumbing" products={trendingProducts.slice().reverse()} link="/products" />
                </div>
            </div>
        </div>
    );
}
