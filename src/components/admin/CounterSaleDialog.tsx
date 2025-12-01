import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store } from 'lucide-react';

const formSchema = z.object({
    amount: z.coerce.number().min(0, 'Amount must be a positive number'),
});

interface CounterSaleDialogProps {
    onSuccess: () => void;
}

export function CounterSaleDialog({ onSuccess }: CounterSaleDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 0,
        },
    });

    // Fetch today's existing counter sale when dialog opens
    useEffect(() => {
        if (open) {
            fetchTodaySale();
        }
    }, [open]);

    async function fetchTodaySale() {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('counter_sales')
            .select('amount')
            .eq('sale_date', today)
            .single();

        if (!error && data) {
            form.reset({ amount: data.amount });
        } else {
            form.reset({ amount: 0 });
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Upsert: Insert if not exists, update if exists (based on sale_date unique constraint)
            const { error } = await supabase
                .from('counter_sales')
                .upsert(
                    {
                        sale_date: today,
                        amount: values.amount,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'sale_date' }
                );

            if (error) throw error;

            toast({
                title: "Counter sale updated",
                description: "Today's counter sale amount has been saved.",
            });
            setOpen(false);
            onSuccess();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Store className="h-4 w-4" />
                    Counter Sale
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Counter Sales (Today)</DialogTitle>
                    <DialogDescription>
                        Enter the total amount of cash/offline sales for today.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount (₹)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
