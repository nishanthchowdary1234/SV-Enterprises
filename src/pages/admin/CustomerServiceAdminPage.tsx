import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
    id: string;
    user_id: string;
    message: string;
    is_admin: boolean;
    created_at: string;
}

interface ChatUser {
    id: string;
    full_name: string | null;
    email: string | null; // Assuming we can join or fetch this
    last_message_at: string;
}

export default function CustomerServiceAdminPage() {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchChatUsers();

        // Subscribe to new messages globally to update user list order or unread status (simplified)
        const channel = supabase
            .channel('admin-chat-list')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                () => {
                    fetchChatUsers(); // Refresh list on new message
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (selectedUserId) {
            fetchMessages(selectedUserId);
            subscribeToMessages(selectedUserId);
        }
    }, [selectedUserId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    async function fetchChatUsers() {
        // This is a bit complex without a dedicated 'chats' table or view.
        // We'll fetch all messages and group them in JS for MVP.
        // Optimized approach: Fetch distinct user_ids from chat_messages?
        // Supabase doesn't support distinct on select easily.
        // We'll fetch the latest message for each user.
        // Actually, let's just fetch all messages (limit 1000) and group.

        const { data: messagesData, error } = await supabase
            .from('chat_messages')
            .select('user_id, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching chat users:', error);
            setLoadingUsers(false);
            return;
        }

        const userMap = new Map<string, string>(); // user_id -> last_message_at
        messagesData?.forEach(msg => {
            if (!userMap.has(msg.user_id)) {
                userMap.set(msg.user_id, msg.created_at);
            }
        });

        const userIds = Array.from(userMap.keys());

        if (userIds.length === 0) {
            setChatUsers([]);
            setLoadingUsers(false);
            return;
        }

        // Fetch profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name') // email is in auth.users, not accessible directly via public API usually unless in profiles
            .in('id', userIds);

        const users: ChatUser[] = userIds.map(id => {
            const profile = profiles?.find(p => p.id === id);
            return {
                id,
                full_name: profile?.full_name || 'Unknown User',
                email: null,
                last_message_at: userMap.get(id)!,
            };
        });

        setChatUsers(users);
        setLoadingUsers(false);
    }

    async function fetchMessages(userId: string) {
        setLoadingMessages(true);
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            setMessages(data || []);
        }
        setLoadingMessages(false);
    }

    function subscribeToMessages(userId: string) {
        const channel = supabase
            .channel(`admin-chat-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `user_id=eq.${userId}`,
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
        if (!newMessage.trim() || !selectedUserId) return;

        const messageToSend = newMessage.trim();
        setNewMessage('');

        const { data, error } = await supabase
            .from('chat_messages')
            .insert([
                {
                    user_id: selectedUserId, // The user we are chatting WITH
                    message: messageToSend,
                    is_admin: true,
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
            setNewMessage(messageToSend);
        } else if (data) {
            setMessages((prev) => [...prev, data]);
        }
    }

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar - User List */}
            <div className="w-64 border-r bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                <div className="p-4 border-b">
                    <h2 className="font-bold">Conversations</h2>
                </div>
                {loadingUsers ? (
                    <div className="p-4 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : chatUsers.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No conversations yet.</div>
                ) : (
                    <div className="divide-y">
                        {chatUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => setSelectedUserId(user.id)}
                                className={`w-full text-left p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${selectedUserId === user.id ? 'bg-white dark:bg-gray-800 border-l-4 border-blue-600' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{user.full_name}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {new Date(user.last_message_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
                {selectedUserId ? (
                    <>
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold">
                                {chatUsers.find(u => u.id === selectedUserId)?.full_name || 'User'}
                            </h3>
                        </div>

                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50"
                        >
                            {loadingMessages ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.is_admin
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white dark:bg-gray-700 border shadow-sm'
                                                }`}
                                        >
                                            <p>{msg.message}</p>
                                            <span className={`text-[10px] block mt-1 ${msg.is_admin ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t bg-white dark:bg-gray-800">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <Input
                                    placeholder="Type your reply..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="flex-1"
                                />
                                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Select a conversation to start chatting
                    </div>
                )}
            </div>
        </div>
    );
}
