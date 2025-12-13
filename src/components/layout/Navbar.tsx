import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
import { Search, ShoppingCart, Home } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CartSheet from '@/components/cart/CartSheet';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/theme-provider';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
    const { user, signOut } = useAuthStore();
    const { items } = useCartStore();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    async function fetchSuggestions(query: string) {
        const { data } = await supabase
            .from('products')
            .select('id, title, slug')
            .ilike('title', `%${query}%`)
            .limit(5);

        if (data) {
            setSuggestions(data);
        }
    }

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const cartItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

    useEffect(() => {
        if (!user) {
            setUnreadMessages(0);
            return;
        }

        fetchUnreadCount();

        const channel = supabase
            .channel('navbar-chat')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    async function fetchUnreadCount() {
        if (!user) return;

        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_admin', true)
            .eq('is_read', false);

        if (!error) {
            setUnreadMessages(count || 0);
        }
    }

    return (
        <header className="sticky top-0 z-50 w-full flex flex-col">
            {/* Main Navbar - Dark Background */}
            <div className="bg-slate-900 text-white py-2">
                <div className="container flex items-center gap-4 h-14">
                    {/* Logo */}
                    <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
                        <Logo className="h-8 w-8 text-white" />
                        <span className="text-xl font-bold tracking-tight ml-1">SV Enterprises</span>
                    </Link>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-3xl relative z-50">
                        <div className="flex items-center h-10 rounded-full overflow-hidden border border-gray-600 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent bg-white/10 relative z-50">
                            <Input
                                type="text"
                                placeholder="Search for products..."
                                className="h-full border-none focus-visible:ring-0 bg-transparent text-white placeholder:text-gray-400 px-4"
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} // Delay to allow clicking suggestions
                                onChange={(e) => {
                                    const query = e.target.value;
                                    setSearchQuery(query);
                                    if (query.length > 1) {
                                        fetchSuggestions(query);
                                    } else {
                                        setSuggestions([]);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (searchQuery) {
                                            navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
                                            setIsSearchFocused(false);
                                        }
                                    }
                                }}
                            />
                            <Button
                                className="h-full rounded-none bg-primary hover:bg-primary/90 text-white border-none px-6"
                                onClick={() => {
                                    if (searchQuery) {
                                        navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
                                        setIsSearchFocused(false);
                                    }
                                }}
                            >
                                <Search className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Search Suggestions */}
                        {isSearchFocused && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                                {suggestions.map((product) => (
                                    <div
                                        key={product.id}
                                        className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-3 transition-colors"
                                        onClick={() => {
                                            navigate(`/products/${product.slug}`);
                                            setIsSearchFocused(false);
                                        }}
                                    >
                                        <Search className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {product.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dimming Overlay */}
                    {isSearchFocused && (
                        <div
                            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px] transition-opacity duration-300"
                            onClick={() => setIsSearchFocused(false)}
                        />
                    )}

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-4">
                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="text-white hover:bg-white/10 rounded-full"
                        >
                            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>

                        {/* Account & Lists */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="hidden md:flex flex-col text-xs leading-none hover:bg-white/10 rounded-md p-2 cursor-pointer transition-colors">
                                    <span className="text-gray-300">Hello, {user ? (useAuthStore.getState().profile?.full_name || 'User') : 'Sign in'}</span>
                                    <span className="font-bold">Account</span>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {user ? (
                                    <>
                                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link to="/orders">Orders</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link to="/profile?tab=settings">Settings</Link></DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                                    </>
                                ) : (
                                    <div className="p-2 flex flex-col gap-2">
                                        <Button className="w-full" asChild>
                                            <Link to="/login">Sign in</Link>
                                        </Button>
                                        <p className="text-xs text-center">New customer? <Link to="/signup" className="text-primary hover:underline">Start here.</Link></p>
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Returns & Orders */}
                        <Link to="/orders" className="hidden md:flex flex-col text-xs leading-none hover:bg-white/10 rounded-md p-2 transition-colors">
                            <span className="text-gray-300">Returns</span>
                            <span className="font-bold">& Orders</span>
                        </Link>

                        {/* Cart */}
                        <div className="flex items-end hover:bg-white/10 rounded-md p-2 cursor-pointer transition-colors">
                            <CartSheet trigger={
                                <div className="flex items-end relative">
                                    <ShoppingCart className="h-6 w-6" />
                                    <div className="flex flex-col leading-none ml-1">
                                        <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                            {cartItemCount}
                                        </span>
                                        <span className="font-bold text-sm hidden md:block">Cart</span>
                                    </div>
                                </div>
                            } />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-Navbar (Categories) */}
            <div className="bg-slate-800 text-white py-2 px-4 flex items-center gap-6 text-sm overflow-x-auto border-t border-slate-700">
                <Link to="/" className="flex items-center gap-2 font-medium hover:text-primary transition-colors whitespace-nowrap">
                    <Home className="h-4 w-4" />
                    Home
                </Link>
                <Link to="/products?sort=deals" className="hover:text-primary transition-colors whitespace-nowrap">Today's Deals</Link>
                <Link to="/products" className="hover:text-primary transition-colors whitespace-nowrap">Products</Link>
                <Link to="/categories" className="hover:text-primary transition-colors whitespace-nowrap">Categories</Link>
                <Link to="/customer-service" className="hover:text-primary transition-colors whitespace-nowrap relative">
                    Customer Service
                    {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                </Link>
            </div>
        </header>
    );
}
