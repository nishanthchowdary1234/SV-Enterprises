import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/types/supabase';

type Category = Database['public']['Tables']['categories']['Row'];

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories(retryCount = 0) {
        try {
            setLoading(true);
            // 15 second timeout for retry
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 15000)
            );

            const queryPromise = supabase
                .from('categories')
                .select('*')
                .order('created_at', { ascending: false });

            const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

            if (error) throw error;

            setCategories(data || []);
            setLoading(false);
        } catch (error: any) {
            if (error.message === 'Timeout' && retryCount < 3) {
                console.log(`Request timed out, retrying... (${retryCount + 1}/3)`);
                await fetchCategories(retryCount + 1);
                return;
            }

            toast({
                variant: "destructive",
                title: "Error fetching categories",
                description: error.message === 'Timeout' ? 'Request timed out after multiple retries' : error.message,
            });
            setLoading(false);
        }
    }

    async function deleteCategory(id: string) {
        try {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;

            toast({
                title: "Category deleted",
                description: "The category has been removed successfully.",
            });
            fetchCategories();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error deleting category",
                description: error.message,
            });
        }
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
                <Button asChild>
                    <Link to="/admin/categories/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Category
                    </Link>
                </Button>
            </div>

            <div className="rounded-md border bg-white dark:bg-gray-800">
                {loading ? (
                    <div className="flex h-48 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No categories found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell>
                                            {category.image_url ? (
                                                <img
                                                    src={category.image_url}
                                                    alt={category.name}
                                                    className="h-10 w-10 rounded-md object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-700" />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{category.name}</TableCell>
                                        <TableCell>{category.slug}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link to={`/admin/categories/${category.id}/edit`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => deleteCategory(category.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div >
    );
}
