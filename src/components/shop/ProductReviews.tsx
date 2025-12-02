import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/useAuthStore';

type Review = {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    user_id: string;
    user: {
        full_name: string | null;
    } | null;
};

interface ProductReviewsProps {
    productId: string;
    onReviewsUpdated?: (reviews: Review[]) => void;
}

export function ProductReviews({ productId, onReviewsUpdated }: ProductReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const { user } = useAuthStore();
    const { toast } = useToast();

    useEffect(() => {
        fetchReviews();
    }, [productId]);

    async function fetchReviews() {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*, user:profiles(full_name)')
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const fetchedReviews = data as any[]; // Cast to any to handle the join type
            setReviews(fetchedReviews);
            if (onReviewsUpdated) {
                onReviewsUpdated(fetchedReviews);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user) {
            toast({
                variant: "destructive",
                title: "Please sign in",
                description: "You must be logged in to leave a review.",
            });
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    product_id: productId,
                    user_id: user.id,
                    rating,
                    comment,
                });

            if (error) throw error;

            toast({
                title: "Review submitted",
                description: "Thank you for your feedback!",
            });
            setComment('');
            setRating(5);
            fetchReviews();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error submitting review",
                description: error.message,
            });
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="py-8 text-center text-muted-foreground">Loading reviews...</div>;
    }

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-bold">Customer Reviews</h3>

            {/* Add Review Form */}
            {user ? (
                <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                    <h4 className="font-semibold">Write a Review</h4>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Rating:</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className={`focus:outline-none ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                    >
                                        <Star className="h-6 w-6 fill-current" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Textarea
                            placeholder="Share your thoughts about this product..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            required
                            className="min-h-[100px]"
                        />
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </Button>
                    </form>
                </div>
            ) : (
                <div className="bg-muted/50 p-6 rounded-lg text-center">
                    <p className="text-muted-foreground mb-4">Please sign in to leave a review.</p>
                </div>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
                {reviews.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No reviews yet. Be the first to review this product!</p>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="border-b pb-6 last:border-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-medium">{review.user?.full_name || 'Anonymous'}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {new Date(review.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex text-yellow-400 mb-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`}
                                    />
                                ))}
                            </div>
                            <p className="text-gray-600 dark:text-gray-300">{review.comment}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
