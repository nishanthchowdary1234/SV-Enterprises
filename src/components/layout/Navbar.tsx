import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CartSheet from '@/components/cart/CartSheet';

import { ModeToggle } from '@/components/mode-toggle';

export default function Navbar() {
    const { user, signOut } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link to="/" className="flex items-center space-x-2">
                        <Logo className="h-8 w-8 text-primary" />
                        <span className="text-xl font-bold tracking-tight">SV Enterprises</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link to="/products" className="transition-colors hover:text-primary">
                            Products
                        </Link>
                        <Link to="/categories" className="transition-colors hover:text-primary">
                            Categories
                        </Link>
                        <Link to="/deals" className="transition-colors hover:text-primary">
                            Deals
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <ModeToggle />
                    <CartSheet />

                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <User className="h-5 w-5" />
                                    <span className="sr-only">User menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link to="/profile" className="cursor-pointer w-full">Profile</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link to="/orders" className="cursor-pointer w-full">Orders</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link to="/profile" className="cursor-pointer w-full">Settings</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout}>
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/login">Log in</Link>
                            </Button>
                            <Button size="sm" asChild>
                                <Link to="/signup">Sign up</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
