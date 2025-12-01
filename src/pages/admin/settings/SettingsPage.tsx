import { useEffect, useState } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    store_name: z.string().min(2),
    support_email: z.string().email(),
    currency: z.string().default('INR'),
});

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            store_name: "",
            support_email: "",
            currency: "INR",
        },

    });

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings(retryCount = 0) {
        try {
            setLoading(true);

            // 15 second timeout for retry
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 15000)
            );

            const queryPromise = supabase
                .from('store_settings')
                .select('*')
                .single();

            const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

            if (error) {
                // If no settings found, we might need to insert default or just ignore if handled by SQL init
                console.error('Error fetching settings:', error);
                if (error.code !== 'PGRST116') { // PGRST116 is "Row not found"
                    throw error;
                }
            } else if (data) {
                form.reset({
                    store_name: data.store_name,
                    support_email: data.support_email,
                    currency: data.currency,
                });
            }
            setLoading(false);
        } catch (error: any) {
            if (error.message === 'Timeout' && retryCount < 3) {
                console.log(`Request timed out, retrying... (${retryCount + 1}/3)`);
                await fetchSettings(retryCount + 1);
                return;
            }

            toast({
                variant: "destructive",
                title: "Error fetching settings",
                description: error.message === 'Timeout' ? 'Request timed out after multiple retries' : error.message,
            });
            setLoading(false);
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setSaving(true);

        // Check if row exists first
        const { data: existing } = await supabase.from('store_settings').select('id').single();

        let error;
        if (existing) {
            const { error: updateError } = await supabase
                .from('store_settings')
                .update(values)
                .eq('id', existing.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('store_settings')
                .insert([values]);
            error = insertError;
        }

        setSaving(false);

        if (error) {
            toast({
                variant: "destructive",
                title: "Error saving settings",
                description: error.message,
            });
        } else {
            toast({
                title: "Settings saved",
                description: "Store settings have been updated successfully.",
            });
        }
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

            <div className="grid gap-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>General Settings</CardTitle>
                        <CardDescription>Manage your store details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="store_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Store Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="support_email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Support Email</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="currency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Currency</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
