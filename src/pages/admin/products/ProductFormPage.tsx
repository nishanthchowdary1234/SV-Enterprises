import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils"

const formSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    description: z.string().optional(),
    price: z.coerce.number().min(0),
    compare_at_price: z.coerce.number().optional(),
    stock_quantity: z.coerce.number().int().min(0),
    category_id: z.string().min(1, "Category is required"),
    slug: z.string()
        .min(2)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphens only"),
    image_url: z.string().optional(),
});

export default function ProductFormPage() {
    const { id } = useParams();
    const isEditing = !!id;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            price: 0,
            stock_quantity: 0,
            category_id: "",
            slug: "",
        },
    });

    // Auto-generate slug from title
    const generateSlug = (value: string) => {
        return value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    };

    useEffect(() => {
        fetchCategories();
        if (isEditing) {
            fetchProduct();
        }
    }, [id]);

    async function fetchCategories() {
        const { data } = await supabase.from('categories').select('id, name');
        if (data) setCategories(data);
    }

    async function fetchProduct() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
            navigate('/admin/products');
            return;
        }

        form.reset({
            title: data.title,
            description: data.description || "",
            price: data.price,
            compare_at_price: data.compare_at_price || undefined,
            stock_quantity: data.stock_quantity,
            category_id: data.category_id || "",
            slug: data.slug,
            image_url: data.image_url || "",
        });
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        const productData = {
            ...values,
            compare_at_price: values.compare_at_price || null,
        };

        let error;
        if (isEditing) {
            const { error: updateError } = await supabase
                .from('products')
                .update(productData)
                .eq('id', id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('products')
                .insert([productData]);
            error = insertError;
        }

        setLoading(false);

        if (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } else {
            toast({
                title: "Success",
                description: `Product ${isEditing ? 'updated' : 'created'} successfully`,
            });
            navigate('/admin/products');
        }
    }

    async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const maxSize = 5 * 1024 * 1024; // 5MB

            if (file.size > maxSize) {
                throw new Error('Image size must be less than 5MB.');
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('products').getPublicUrl(filePath);
            form.setValue('image_url', data.publicUrl);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error uploading image",
                description: error.message,
            });
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    {isEditing ? 'Edit Product' : 'New Product'}
                </h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error('Form errors:', errors))} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Product Name"
                                        {...field}
                                        onChange={(e) => {
                                            field.onChange(e);
                                            if (!isEditing) {
                                                form.setValue('slug', generateSlug(e.target.value));
                                            }
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Slug</FormLabel>
                                <FormControl>
                                    <Input placeholder="product-name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="stock_quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stock</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Category</FormLabel>
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={open}
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? categories.find(
                                                        (category) => category.id === field.value
                                                    )?.name
                                                    : "Select a category"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search category..." />
                                            <CommandList>
                                                <CommandEmpty>No category found.</CommandEmpty>
                                                <CommandGroup>
                                                    {categories.map((category) => (
                                                        <CommandItem
                                                            value={category.name}
                                                            key={category.id}
                                                            onSelect={() => {
                                                                form.setValue("category_id", category.id)
                                                                setOpen(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    category.id === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {category.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Product description..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-2">
                        <FormLabel>Product Image</FormLabel>
                        <div className="flex items-center gap-4">
                            {form.watch('image_url') && (
                                <img
                                    src={form.watch('image_url')}
                                    alt="Preview"
                                    className="h-20 w-20 rounded-md object-cover"
                                />
                            )}
                            <div className="flex-1">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        handleImageUpload(e);
                                        e.target.value = ''; // Reset input
                                    }}
                                    disabled={uploading}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/admin/products')}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || uploading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Product'
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
