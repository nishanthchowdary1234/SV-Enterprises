export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string
          username: string | null
          role: 'user' | 'admin' | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          updated_at?: string
          username?: string | null
          role?: 'user' | 'admin' | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          updated_at?: string
          username?: string | null
          role?: 'user' | 'admin' | null
          avatar_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          image_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          title: string
          description: string | null
          price: number
          compare_at_price: number | null
          stock_quantity: number
          category_id: string | null
          slug: string
          image_url: string | null
          is_featured: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          price: number
          compare_at_price?: number | null
          stock_quantity?: number
          category_id?: string | null
          slug: string
          image_url?: string | null
          is_featured?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          price?: number
          compare_at_price?: number | null
          stock_quantity?: number
          category_id?: string | null
          slug?: string
          image_url?: string | null
          is_featured?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          is_primary: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      carts: {
        Row: {
          id: string
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      cart_items: {
        Row: {
          id: string
          cart_id: string
          product_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          cart_id: string
          product_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          cart_id?: string
          product_id?: string
          quantity?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
          total_amount: number
          shipping_address_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          status?: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
          total_amount: number
          shipping_address_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          status?: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
          total_amount?: number
          shipping_address_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          price_at_purchase: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          price_at_purchase: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          price_at_purchase?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          name: string
          street: string
          city: string
          state: string
          zip: string
          country: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          street: string
          city: string
          state: string
          zip: string
          country: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          street?: string
          city?: string
          state?: string
          zip?: string
          country?: string
          is_default?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
  }
}
