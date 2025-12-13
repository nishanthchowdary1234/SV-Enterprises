import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

type Product = Database['public']['Tables']['products']['Row'] & {
    category: { name: string } | null;
};

import { ProductReviews } from '@/components/shop/ProductReviews';

// ... (previous imports)

export default function ProductDetailPage() {
    const { slug } = useParams();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [averageRating, setAverageRating] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);
    const { toast } = useToast();
    const { addItem, items, updateQuantity, removeItem } = useCartStore();

    useEffect(() => {
        if (slug) fetchProduct();
    }, [slug]);

    async function fetchProduct() {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*, category:categories(name)')
            .eq('slug', slug)
            .single();

        if (error) {
            toast({
                variant: "destructive",
                title: "Error fetching product",
                description: error.message,
            });
        } else {
            // @ts-ignore
            setProduct(data);
        }
        setLoading(false);
    }

    const handleReviewsUpdated = (reviews: any[]) => {
        setReviewCount(reviews.length);
        if (reviews.length > 0) {
            const total = reviews.reduce((sum, review) => sum + review.rating, 0);
            setAverageRating(total / reviews.length);
        } else {
            setAverageRating(0);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="container py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Product not found</h1>
                <Button asChild>
                    <Link to="/products">Back to Products</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container py-8 md:py-16">
            <Button variant="ghost" className="mb-8" asChild>
                <Link to="/products">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
                </Link>
            </Button>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-16 mb-16">
                {/* Media Section */}
                <div className="space-y-4">
                    <div className="aspect-square rounded-lg border bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                No Image
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Section */}
                <div className="flex flex-col">
                    <div className="mb-2 text-sm text-gray-500">{product.category?.name}</div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.title}</h1>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center text-yellow-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-5 w-5 ${i < Math.round(averageRating) ? 'fill-current' : 'text-gray-300'}`}
                                />
                            ))}
                        </div>
                        <span className="text-sm text-gray-500">
                            ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                        </span>
                    </div>

                    <div className="text-3xl font-bold mb-8">
                        ₹{product.price}
                        {product.compare_at_price && product.compare_at_price > product.price && (
                            <span className="ml-3 text-lg text-gray-400 line-through">
                                ₹{product.compare_at_price}
                            </span>
                        )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                        {product.description || "No description available."}
                    </p>

                    <div className="mt-auto space-y-4">
                        {/* Low Stock Warning */}
                        {product.stock_quantity > 0 && product.stock_quantity < 20 && (
                            <div className="text-red-600 font-medium">
                                Only {product.stock_quantity} left in stock!
                            </div>
                        )}
                        {product.stock_quantity === 0 && (
                            <div className="text-red-600 font-medium">
                                Out of Stock
                            </div>
                        )}

                        {(() => {
                            const cartItem = items.find(item => item.id === product.id);
                            return cartItem ? (
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="flex items-center border rounded-md">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-none"
                                            onClick={() => {
                                                if (cartItem.quantity > 1) {
                                                    updateQuantity(product.id, cartItem.quantity - 1);
                                                } else {
                                                    removeItem(product.id);
                                                }
                                            }}
                                        >
                                            -
                                        </Button>
                                        <span className="w-12 text-center font-medium">
                                            {cartItem.quantity}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-none"
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
                                            +
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    size="lg"
                                    className="w-full md:w-auto text-lg px-8"
                                    disabled={product.stock_quantity === 0}
                                    onClick={() => {
                                        addItem(product);
                                        toast({ title: "Added to cart", description: `${product.title} added to your cart.` });
                                    }}
                                >
                                    <ShoppingCart className="mr-2 h-5 w-5" />
                                    {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                                </Button>
                            );
                        })()}
                        <p className="text-sm text-gray-500 text-center md:text-left">
                            Free shipping on orders over ₹100
                        </p>
                    </div>
                </div>
            </div>

            {/* Reviews Section */}
            <div className="border-t pt-16">
                <ProductReviews productId={product.id} onReviewsUpdated={handleReviewsUpdated} />
            </div>
        </div>
    );
}
