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
    const [errors, setErrors] = useState<string[]>([]);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null);
            setErrors([]);
        }
    };

    const processImport = async () => {
        if (!file) return;

        setLoading(true);
        setStats(null);
        setErrors([]);

        try {
            // 1. Fetch all categories for lookup
            const { data: categories, error: catError } = await supabase
                .from('categories')
                .select('id, name');

            if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`);

            // Map: lowercase name -> id
            const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]));

            // 2. Read file as text to handle potential formatting issues (like entire rows being quoted)
            const text = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });

            // 3. Parse CSV
            Papa.parse<CSVRow>(text, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim().toLowerCase(),
                complete: async (results) => {
                    let successCount = 0;
                    let failCount = 0;
                    const newErrors: string[] = [];
                    const rows = results.data;

                    if (rows.length === 0) {
                        setErrors(["The CSV file appears to be empty or could not be parsed."]);
                        setLoading(false);
                        return;
                    }

                    // Check if headers were parsed correctly
                    const firstRow = rows[0];
                    if (!('title' in firstRow) || !('price' in firstRow)) {
                        console.log('Parsed headers:', Object.keys(firstRow));
                        setErrors([
                            "Could not find 'title' or 'price' columns.",
                            "Detected columns: " + Object.keys(firstRow).join(', '),
                            "Please check the template and ensure your CSV headers match."
                        ]);
                        setLoading(false);
                        return;
                    }

                    for (const [index, row] of rows.entries()) {
                        try {
                            // Validate required fields
                            if (!row.title || !row.price || !row.category) {
                                throw new Error(`Row ${index + 1}: Missing required fields (title, price, or category)`);
                            }

                            const categoryName = row.category.trim();
                            const categoryKey = categoryName.toLowerCase();
                            let categoryId = categoryMap.get(categoryKey);

                            // Create category if it doesn't exist
                            if (!categoryId) {
                                const { data: newCategory, error: createCatError } = await supabase
                                    .from('categories')
                                    .insert({
                                        name: categoryName,
                                        slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(7)
                                    })
                                    .select('id')
                                    .single();

                                if (createCatError) throw new Error(`Row ${index + 1}: Failed to create category '${categoryName}': ${createCatError.message}`);

                                categoryId = newCategory.id;
                                categoryMap.set(categoryKey, categoryId); // Update map for subsequent rows
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

                            if (error) throw new Error(`Row ${index + 1}: Failed to insert product '${row.title}': ${error.message}`);
                            successCount++;
                        } catch (err: any) {
                            console.error('Error importing row:', row, err);
                            failCount++;
                            newErrors.push(err.message || `Row ${index + 1}: Unknown error`);
                        }
                    }

                    setStats({
                        total: rows.length,
                        success: successCount,
                        failed: failCount
                    });
                    setErrors(newErrors);
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
                            description: "No products were imported. Check the error list below.",
                        });
                    }
                },
                error: (error: any) => {
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
            <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
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

                    {errors.length > 0 && (
                        <div className="rounded-md bg-red-50 p-4 space-y-2 max-h-40 overflow-y-auto text-xs text-red-600 border border-red-200">
                            <p className="font-semibold">Errors:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                {errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
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
