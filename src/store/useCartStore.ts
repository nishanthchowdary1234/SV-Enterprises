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
                if (!user) {
                    console.log('fetchCart: No user logged in');
                    return;
                }
                console.log('fetchCart: Starting for user', user.id);

                try {
                    // 1. Get or Create Cart
                    let { data: cart, error: cartError } = await supabase
                        .from('carts')
                        .select('id')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (cartError) {
                        console.error('fetchCart: Error fetching cart:', cartError);
                        return;
                    }

                    if (!cart) {
                        console.log('fetchCart: Creating new cart');
                        const { data: newCart, error } = await supabase
                            .from('carts')
                            .insert({ user_id: user.id })
                            .select()
                            .single();

                        if (error || !newCart) {
                            console.error('fetchCart: Error creating cart:', error);
                            return;
                        }
                        cart = newCart;
                    }

                    if (!cart) return;
                    console.log('fetchCart: Cart ID', cart.id);

                    // 2. Merge Local Items to DB
                    const localItems = get().items;
                    console.log('fetchCart: Local items to merge', localItems.length);

                    if (localItems.length > 0) {
                        for (const item of localItems) {
                            // Check if item exists in DB cart
                            const { data: existingDbItem } = await supabase
                                .from('cart_items')
                                .select('id, quantity')
                                .eq('cart_id', cart.id)
                                .eq('product_id', item.id)
                                .maybeSingle();

                            if (existingDbItem) {
                                console.log('fetchCart: Updating existing item', item.id);
                                await supabase
                                    .from('cart_items')
                                    .update({ quantity: existingDbItem.quantity + item.quantity })
                                    .eq('id', existingDbItem.id);
                            } else {
                                console.log('fetchCart: Inserting new item', item.id);
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
                        console.error('fetchCart: Error fetching final items:', itemsError);
                        return;
                    }

                    console.log('fetchCart: Final items fetched', items?.length);

                    if (items) {
                        const cartItems: CartItem[] = items.map((item: any) => ({
                            ...item.products,
                            quantity: item.quantity,
                        }));
                        set({ items: cartItems });
                    }
                } catch (error) {
                    console.error('fetchCart: Unexpected error:', error);
                }
            },
            addItem: async (product) => {
                console.log('addItem: Adding product', product.id);
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
                            .maybeSingle();

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
                        .maybeSingle();

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
                        .maybeSingle();

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
                        .maybeSingle();

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
