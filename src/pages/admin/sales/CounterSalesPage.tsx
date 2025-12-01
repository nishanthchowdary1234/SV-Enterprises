import { useEffect, useState } from 'react';
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
import { Loader2, Trash2, ArrowLeft } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';
import { CounterSaleDialog } from '@/components/admin/CounterSaleDialog';

type CounterSale = {
    id: string;
    sale_date: string;
    amount: number;
    created_at: string;
};

export default function CounterSalesPage() {
    const [sales, setSales] = useState<CounterSale[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchSales();
    }, []);

    async function fetchSales() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('counter_sales')
                .select('*')
                .order('sale_date', { ascending: false });

            if (error) throw error;

            setSales(data || []);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error fetching sales",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }

    async function deleteSale(id: string) {
        try {
            const { error } = await supabase
                .from('counter_sales')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: "Sale deleted",
                description: "The counter sale entry has been removed.",
            });
            fetchSales();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error deleting sale",
                description: error.message,
            });
        }
    }

    async function deleteAllSales() {
        try {
            const { error } = await supabase
                .from('counter_sales')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (error) throw error;

            toast({
                title: "All sales deleted",
                description: "All counter sales history has been cleared.",
            });
            fetchSales();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error deleting sales",
                description: error.message,
            });
        }
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/admin">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Counter Sales History</h1>
                </div>
                <div className="flex items-center gap-4">
                    <CounterSaleDialog onSuccess={fetchSales} />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={sales.length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear History
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete ALL counter sales records.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={deleteAllSales} className="bg-red-600 hover:bg-red-700">
                                    Delete All
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div className="rounded-md border bg-white dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : sales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No counter sales found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sales.map((sale) => (
                                <TableRow key={sale.id}>
                                    <TableCell>
                                        {new Date(sale.sale_date).toLocaleDateString(undefined, {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        ₹{sale.amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will remove the counter sale record for {new Date(sale.sale_date).toLocaleDateString()}.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteSale(sale.id)} className="bg-red-600 hover:bg-red-700">
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
