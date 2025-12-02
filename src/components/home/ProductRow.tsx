import { Link } from "react-router-dom";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/supabase";
import { useCartStore } from "@/store/useCartStore";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus } from "lucide-react";

type Product = Database['public']['Tables']['products']['Row'];

interface ProductRowProps {
    title: string;
    products: Product[];
    link?: string;
}

export default function ProductRow({ title, products, link }: ProductRowProps) {
    const { addItem, items, updateQuantity } = useCartStore();
    const { toast } = useToast();

    const handleAddToCart = (product: Product) => {
        addItem(product);
        toast({
            title: "Added to cart",
            description: `${product.title} has been added to your cart.`,
        });
    };

    if (products.length === 0) return null;

    return (
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{title}</h2>
                {link && (
                    <Link to={link} className="text-sm text-blue-600 hover:underline hover:text-red-600">
                        See more
                    </Link>
                )}
            </div>

            <Carousel
                opts={{
                    align: "start",
                }}
                className="w-full"
            >
                <CarouselContent className="-ml-4">
                    {products.map((product) => (
                        <CarouselItem key={product.id} className="pl-4 basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                            <div className="flex flex-col h-full">
                                <Link to={`/products/${product.slug}`} className="bg-gray-100 dark:bg-gray-700 aspect-square rounded-md overflow-hidden mb-2">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.title}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                            No Image
                                        </div>
                                    )}
                                </Link>

                                <Link to={`/products/${product.slug}`} className="text-sm font-medium hover:text-red-600 hover:underline line-clamp-2 mb-1 h-10" title={product.title}>
                                    {product.title}
                                </Link>

                                <div className="mt-auto">
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-lg font-bold">₹{product.price.toFixed(0)}</span>
                                        {product.compare_at_price && product.compare_at_price > product.price && (
                                            <span className="text-xs text-gray-500 line-through">₹{product.compare_at_price.toFixed(0)}</span>
                                        )}
                                    </div>

                                    {/* Add to Cart Button - Compact */}
                                    {(() => {
                                        const cartItem = items.find(item => item.id === product.id);
                                        return cartItem ? (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-4 text-center text-xs font-medium">
                                                    {cartItem.quantity}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" className="w-full h-8 text-xs bg-[#f0c14b] hover:bg-[#ddb347] text-black border-none" onClick={() => handleAddToCart(product)}>
                                                Add to Cart
                                            </Button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="-left-3 h-8 w-8" />
                <CarouselNext className="-right-3 h-8 w-8" />
            </Carousel>
        </section>
    );
}
