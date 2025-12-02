import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
    id: string;
    user_id: string;
    message: string;
    is_admin: boolean;
    created_at: string;
}

export default function CustomerServicePage() {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (user) {
            fetchMessages();
            subscribeToMessages();
        } else {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    async function fetchMessages() {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            setMessages(data || []);
        }
        setLoading(false);
    }

    function subscribeToMessages() {
        const channel = supabase
            .channel('chat-user')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `user_id=eq.${user!.id}`,
                },
                (payload) => {
                    const newMessage = payload.new as Message;
                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }

    async function handleSendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const messageToSend = newMessage.trim();
        setNewMessage('');

        const { data, error } = await supabase
            .from('chat_messages')
            .insert([
                {
                    user_id: user.id,
                    message: messageToSend,
                    is_admin: false,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            toast({
                variant: "destructive",
                title: "Error sending message",
                description: "Please try again.",
            });
            setNewMessage(messageToSend); // Restore message
        } else if (data) {
            setMessages((prev) => [...prev, data]);
        }
    }

    if (!user) {
        return (
            <div className="container py-12 text-center">
                <h1 className="text-2xl font-bold mb-4">Customer Service</h1>
                <p>Please sign in to chat with our support team.</p>
            </div>
        );
    }

    return (
        <div className="container py-8 h-[calc(100vh-4rem)] flex flex-col">
            <h1 className="text-2xl font-bold mb-4">Customer Service Chat</h1>

            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border shadow-sm flex flex-col overflow-hidden">
                {/* Chat Window */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">
                            Start a conversation with us!
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.is_admin
                                        ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white'
                                        : 'bg-blue-600 text-white'
                                        }`}
                                >
                                    <p>{msg.message}</p>
                                    <span className="text-[10px] opacity-70 block mt-1">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
