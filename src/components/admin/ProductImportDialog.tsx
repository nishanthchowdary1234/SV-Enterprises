import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Upload, FileUp, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

interface ProductImportDialogProps {
    onSuccess: () => void;
}

type CSVRow = {
    title: string;
    description: string;
    price: string;
    compare_at_price?: string;
    stock_quantity: string;
    category: string;
    image_url?: string;
};

export function ProductImportDialog({ onSuccess }: ProductImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [stats, setStats] = useState<{ total: number; success: number; failed: number } | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null);
        }
    };

    const processImport = async () => {
        if (!file) return;

        setLoading(true);
        setStats(null);

        try {
            // 1. Fetch all categories for lookup
            const { data: categories, error: catError } = await supabase
                .from('categories')
                .select('id, name');

            if (catError) throw catError;

            const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]));

            // 2. Parse CSV
            Papa.parse<CSVRow>(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    let successCount = 0;
                    let failCount = 0;
                    const rows = results.data;

                    for (const row of rows) {
                        try {
                            // Validate required fields
                            if (!row.title || !row.price || !row.category) {
                                throw new Error(`Missing required fields for product: ${row.title || 'Unknown'}`);
                            }

                            // Find category ID
                            const categoryId = categoryMap.get(row.category.trim().toLowerCase());
                            if (!categoryId) {
                                throw new Error(`Category not found: ${row.category}`);
                            }

                            // Insert product
                            const { error } = await supabase.from('products').insert({
                                title: row.title.trim(),
                                description: row.description?.trim() || '',
                                price: parseFloat(row.price),
                                compare_at_price: row.compare_at_price ? parseFloat(row.compare_at_price) : null,
                                stock_quantity: parseInt(row.stock_quantity) || 0,
                                category_id: categoryId,
                                image_url: row.image_url?.trim() || null,
                                slug: row.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(7)
                            });

                            if (error) throw error;
                            successCount++;
                        } catch (err) {
                            console.error('Error importing row:', row, err);
                            failCount++;
                        }
                    }

                    setStats({
                        total: rows.length,
                        success: successCount,
                        failed: failCount
                    });
                    setLoading(false);

                    if (successCount > 0) {
                        toast({
                            title: "Import Completed",
                            description: `Successfully imported ${successCount} products. ${failCount} failed.`,
                        });
                        onSuccess();
                    } else {
                        toast({
                            variant: "destructive",
                            title: "Import Failed",
                            description: "No products were imported. Check your CSV format.",
                        });
                    }
                },
                error: (error) => {
                    console.error('CSV Parse Error:', error);
                    toast({
                        variant: "destructive",
                        title: "CSV Error",
                        description: "Failed to parse CSV file.",
                    });
                    setLoading(false);
                }
            });
        } catch (error: any) {
            console.error('Import Error:', error);
            toast({
                variant: "destructive",
                title: "Import Error",
                description: error.message,
            });
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const headers = ['title', 'description', 'price', 'compare_at_price', 'stock_quantity', 'category', 'image_url'];
        const sample = ['Sample Product', 'Description here', '99.99', '120.00', '100', 'Category Name', 'https://example.com/image.jpg'];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), sample.join(',')].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "product_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import Products</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk import products.
                        <br />
                        <button onClick={downloadTemplate} className="text-primary hover:underline text-sm mt-1 inline-flex items-center">
                            <FileUp className="h-3 w-3 mr-1" /> Download Template
                        </button>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Input
                            id="csv-file"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            disabled={loading}
                        />
                    </div>

                    {stats && (
                        <div className="rounded-md bg-muted p-4 space-y-2">
                            <div className="flex items-center text-sm text-green-600">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {stats.success} imported successfully
                            </div>
                            {stats.failed > 0 && (
                                <div className="flex items-center text-sm text-red-600">
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    {stats.failed} failed
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={processImport} disabled={!file || loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import Products
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
