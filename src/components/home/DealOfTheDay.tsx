import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";
import { Loader2 } from "lucide-react";

type Product = Database['public']['Tables']['products']['Row'];

export default function DealOfTheDay() {
    const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 45, seconds: 30 });
    const [dealProduct, setDealProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        fetchDealOfTheDay();

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    async function fetchDealOfTheDay() {
        try {
            // Fetch products that have a compare_at_price (indicating a discount)
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .not('compare_at_price', 'is', null);

            if (error) throw error;

            if (data && data.length > 0) {
                // Find the product with the highest discount percentage
                let bestDeal: Product | null = null;
                let maxDiscount = 0;

                data.forEach(product => {
                    if (product.compare_at_price && product.compare_at_price > product.price) {
                        const currentDiscount = ((product.compare_at_price - product.price) / product.compare_at_price) * 100;
                        if (currentDiscount > maxDiscount) {
                            maxDiscount = currentDiscount;
                            bestDeal = product;
                        }
                    }
                });

                if (bestDeal) {
                    setDealProduct(bestDeal);
                    setDiscount(Math.round(maxDiscount));
                } else {
                    setDealProduct(null);
                }
            }
        } catch (error) {
            console.error("Error fetching deal of the day:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </section>
        );
    }

    if (!dealProduct) {
        return (
            <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col justify-center items-center text-center">
                <h3 className="text-xl font-bold mb-2">Deal of the Day</h3>
                <p className="text-gray-500">No deals available right now.</p>
            </section>
        );
    }

    return (
        <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Deal of the Day</h3>

            <div className="flex-1 flex flex-col items-center text-center">
                <Link to={`/products/${dealProduct.slug}`} className="relative w-full aspect-square mb-4 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden p-4 block group">
                    {dealProduct.image_url ? (
                        <img
                            src={dealProduct.image_url}
                            alt={dealProduct.title}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                    )}
                    <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        -{discount}%
                    </span>
                </Link>

                <Link to={`/products/${dealProduct.slug}`}>
                    <h4 className="font-semibold text-lg mb-1 line-clamp-2 hover:text-primary transition-colors">
                        {dealProduct.title}
                    </h4>
                </Link>

                <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-red-600">₹{dealProduct.price}</span>
                    {dealProduct.compare_at_price && dealProduct.compare_at_price > dealProduct.price && (
                        <span className="text-sm text-gray-500 line-through">₹{dealProduct.compare_at_price}</span>
                    )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {dealProduct.description || "Don't miss out on this limited time offer!"}
                </p>

                <div className="w-full mt-auto">
                    <div className="flex justify-center gap-1 text-sm font-mono mb-3 text-gray-700 dark:text-gray-300">
                        <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{String(timeLeft.hours).padStart(2, '0')}</span>
                        <span className="self-center">:</span>
                        <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span>
                        <span className="self-center">:</span>
                        <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    </div>
                    <Button className="w-full" asChild>
                        <Link to={`/products/${dealProduct.slug}`}>See Deal</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
