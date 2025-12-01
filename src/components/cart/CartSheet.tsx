import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from '@/components/ui/sheet';

export default function CartSheet() {
    const { items, removeItem, updateQuantity, total } = useCartStore();
    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="sr-only">Cart</span>
                    {itemCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                            {itemCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
                <SheetHeader className="px-1">
                    <SheetTitle>Cart ({itemCount})</SheetTitle>
                </SheetHeader>
                <Separator className="my-4" />
                {items.length > 0 ? (
                    <>
                        <ScrollArea className="flex-1 pr-6">
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="flex gap-4">
                                        <div className="h-20 w-20 rounded-md border bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-1 flex-col justify-between">
                                            <div className="flex justify-between">
                                                <h3 className="font-medium line-clamp-1">{item.title}</h3>
                                                <p className="font-bold">₹{item.price * item.quantity}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-4 text-center text-sm">
                                                        {item.quantity}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-600"
                                                    onClick={() => removeItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="space-y-4 pr-6 pt-4">
                            <Separator />
                            <div className="flex items-center justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>₹{total().toFixed(2)}</span>
                            </div>
                            <SheetFooter>
                                <Button className="w-full" asChild>
                                    <Link to="/checkout">Proceed to Checkout</Link>
                                </Button>
                            </SheetFooter>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center space-y-2">
                        <ShoppingBag className="h-12 w-12 text-gray-400" />
                        <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Your cart is empty
                        </span>
                        <Button variant="link" asChild>
                            <Link to="/products">Start Shopping</Link>
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
