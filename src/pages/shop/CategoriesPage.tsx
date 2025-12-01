import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { Loader2 } from 'lucide-react';

type Category = Database['public']['Tables']['categories']['Row'];

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        setLoading(true);
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                attempts++;
                // 15 second timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 15000)
                );

                const query = supabase
                    .from('categories')
                    .select('*')
                    .order('name');

                const { data, error } = await Promise.race([
                    query,
                    timeoutPromise
                ]) as any;

                if (error) throw error;
                setCategories(data || []);
                break; // Success
            } catch (error) {
                console.error(`Attempt ${attempts} failed:`, error);
                if (attempts === maxAttempts) {
                    // Only show error on last attempt
                } else {
                    await new Promise(resolve => setTimeout(resolve, attempts * 1000));
                }
            }
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">Shop by Category</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categories.map((category) => (
                    <Link
                        key={category.id}
                        to={`/products?category=${encodeURIComponent(category.name)}`}
                        className="group block"
                    >
                        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-3 border transition-shadow hover:shadow-md">
                            {category.image_url ? (
                                <img
                                    src={category.image_url}
                                    alt={category.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No Image
                                </div>
                            )}
                        </div>
                        <h3 className="font-semibold text-center group-hover:text-primary transition-colors">
                            {category.name}
                        </h3>
                    </Link>
                ))}
            </div>
        </div>
    );
}
