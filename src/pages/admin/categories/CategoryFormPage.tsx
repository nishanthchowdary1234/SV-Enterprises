import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    slug: z.string().min(2),
    image_url: z.string().optional(),
});

export default function CategoryFormPage() {
    const { id } = useParams();
    const isEditing = !!id;
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            slug: "",
            image_url: "",
        },
    });

    useEffect(() => {
        if (isEditing) {
            fetchCategory();
        }
    }, [id]);

    async function fetchCategory() {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
            navigate('/admin/categories');
            return;
        }

        form.reset({
            name: data.name,
            slug: data.slug,
            image_url: data.image_url || "",
        });
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        let error;
        if (isEditing) {
            const { error: updateError } = await supabase
                .from('categories')
                .update(values)
                .eq('id', id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('categories')
                .insert([values]);
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
                description: `Category ${isEditing ? 'updated' : 'created'} successfully`,
            });
            navigate('/admin/categories');
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
            const filePath = `categories/${fileName}`;

            // Note: This assumes a 'categories' bucket exists or we use 'products' bucket
            // For simplicity, let's use 'products' bucket for now as instructed in Phase 2
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
                    {isEditing ? 'Edit Category' : 'New Category'}
                </h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Category Name" {...field} />
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
                                    <Input placeholder="category-slug" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-4">
                        <FormLabel>Category Image</FormLabel>
                        <Tabs defaultValue="upload" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                                <TabsTrigger value="url">Image URL</TabsTrigger>
                            </TabsList>
                            <TabsContent value="upload" className="space-y-4">
                                <div className="flex items-center gap-4">
                                    {form.watch('image_url') && (
                                        <img
                                            src={form.watch('image_url')}
                                            alt="Preview"
                                            className="h-20 w-20 rounded-md object-cover border"
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
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Max size: 5MB. Supported formats: JPG, PNG, WebP.
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="url" className="space-y-4">
                                <div className="flex items-center gap-4">
                                    {form.watch('image_url') && (
                                        <img
                                            src={form.watch('image_url')}
                                            alt="Preview"
                                            className="h-20 w-20 rounded-md object-cover border"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <FormField
                                            control={form.control}
                                            name="image_url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="https://example.com/image.jpg" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Paste a direct link to an image.
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/admin/categories')}
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
                                'Save Category'
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
