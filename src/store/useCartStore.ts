import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Database } from '@/types/supabase';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './useAuthStore';

type Product = Database['public']['Tables']['products']['Row'];

export interface CartItem extends Product {
    quantity: number;
}

interface CartState {
    items: CartItem[];
    addItem: (product: Product) => Promise<void>;
    removeItem: (productId: string) => Promise<void>;
    updateQuantity: (productId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    total: () => number;
    fetchCart: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            fetchCart: async () => {
                const user = useAuthStore.getState().user;
                if (!user) return;

                // 1. Get or Create Cart
                let { data: cart } = await supabase
                    .from('carts')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (!cart) {
                    const { data: newCart, error } = await supabase
                        .from('carts')
                        .insert({ user_id: user.id })
                        .select()
                        .single();

                    if (error || !newCart) {
                        console.error('Error creating cart:', error);
                        return;
                    }
                    cart = newCart;
                }

                if (!cart) return;

                // 2. Merge Local Items to DB
                const localItems = get().items;
                if (localItems.length > 0) {
                    for (const item of localItems) {
                        // Check if item exists in DB cart
                        const { data: existingDbItem } = await supabase
                            .from('cart_items')
                            .select('id, quantity')
                            .eq('cart_id', cart.id)
                            .eq('product_id', item.id)
                            .single();

                        if (existingDbItem) {
                            // Update quantity (strategy: add local quantity to DB quantity)
                            await supabase
                                .from('cart_items')
                                .update({ quantity: existingDbItem.quantity + item.quantity })
                                .eq('id', existingDbItem.id);
                        } else {
                            // Insert new item
                            await supabase
                                .from('cart_items')
                                .insert({
                                    cart_id: cart.id,
                                    product_id: item.id,
                                    quantity: item.quantity
                                });
                        }
                    }
                }

                // 3. Fetch Final Items from DB
                const { data: items, error: itemsError } = await supabase
                    .from('cart_items')
                    .select('*, products(*)')
                    .eq('cart_id', cart.id);

                if (itemsError) {
                    console.error('Error fetching cart items:', itemsError);
                    return;
                }

                if (items) {
                    const cartItems: CartItem[] = items.map((item: any) => ({
                        ...item.products,
                        quantity: item.quantity,
                    }));
                    set({ items: cartItems });
                }
            },
            addItem: async (product) => {
                const items = get().items;
                const existingItem = items.find((item) => item.id === product.id);
                const user = useAuthStore.getState().user;

                // Optimistic Update
                if (existingItem) {
                    set({
                        items: items.map((item) =>
                            item.id === product.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        ),
                    });
                } else {
                    set({ items: [...items, { ...product, quantity: 1 }] });
                }

                // Database Sync
                if (user) {
                    try {
                        const { data: cart } = await supabase
                            .from('carts')
                            .select('id')
                            .eq('user_id', user.id)
                            .single();

                        if (cart) {
                            if (existingItem) {
                                await supabase
                                    .from('cart_items')
                                    .update({ quantity: existingItem.quantity + 1 })
                                    .eq('cart_id', cart.id)
                                    .eq('product_id', product.id);
                            } else {
                                await supabase
                                    .from('cart_items')
                                    .insert({
                                        cart_id: cart.id,
                                        product_id: product.id,
                                        quantity: 1
                                    });
                            }
                        }
                    } catch (error) {
                        console.error('Error syncing cart item:', error);
                        // Revert on error? For now, we'll just log it.
                    }
                }
            },
            removeItem: async (productId) => {
                set({ items: get().items.filter((item) => item.id !== productId) });

                const user = useAuthStore.getState().user;
                if (user) {
                    const { data: cart } = await supabase
                        .from('carts')
                        .select('id')
                        .eq('user_id', user.id)
                        .single();

                    if (cart) {
                        await supabase
                            .from('cart_items')
                            .delete()
                            .eq('cart_id', cart.id)
                            .eq('product_id', productId);
                    }
                }
            },
            updateQuantity: async (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }

                set({
                    items: get().items.map((item) =>
                        item.id === productId ? { ...item, quantity } : item
                    ),
                });

                const user = useAuthStore.getState().user;
                if (user) {
                    const { data: cart } = await supabase
                        .from('carts')
                        .select('id')
                        .eq('user_id', user.id)
                        .single();

                    if (cart) {
                        await supabase
                            .from('cart_items')
                            .update({ quantity })
                            .eq('cart_id', cart.id)
                            .eq('product_id', productId);
                    }
                }
            },
            clearCart: async () => {
                set({ items: [] });

                const user = useAuthStore.getState().user;
                if (user) {
                    const { data: cart } = await supabase
                        .from('carts')
                        .select('id')
                        .eq('user_id', user.id)
                        .single();

                    if (cart) {
                        await supabase
                            .from('cart_items')
                            .delete()
                            .eq('cart_id', cart.id);
                    }
                }
            },
            total: () => {
                return get().items.reduce(
                    (total, item) => total + item.price * item.quantity,
                    0
                );
            },
        }),
        {
            name: 'cart-storage',
        }
    )
);
