import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, User, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
    id: string;
    user_id: string;
    message: string;
    is_admin: boolean;
    is_read: boolean;
    created_at: string;
}

interface ChatUser {
    id: string;
    full_name: string | null;
    email: string | null;
    last_message_at: string;
    unread_count: number;
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

        const channel = supabase
            .channel('admin-chat-list')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'chat_messages' },
                () => {
                    fetchChatUsers();
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
            markMessagesAsRead(selectedUserId);
        }
    }, [selectedUserId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    async function fetchChatUsers() {
        // Fetch all messages to group and count unread
        const { data: messagesData, error } = await supabase
            .from('chat_messages')
            .select('user_id, created_at, is_read, is_admin')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching chat users:', error);
            setLoadingUsers(false);
            return;
        }

        const userMap = new Map<string, { last_at: string, unread: number }>();

        messagesData?.forEach(msg => {
            if (!userMap.has(msg.user_id)) {
                userMap.set(msg.user_id, { last_at: msg.created_at, unread: 0 });
            }

            const userData = userMap.get(msg.user_id)!;
            // Count unread messages FROM user (not admin)
            if (!msg.is_read && !msg.is_admin) {
                userData.unread += 1;
            }
        });

        const userIds = Array.from(userMap.keys());

        if (userIds.length === 0) {
            setChatUsers([]);
            setLoadingUsers(false);
            return;
        }

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

        const users: ChatUser[] = userIds.map(id => {
            const profile = profiles?.find(p => p.id === id);
            const stats = userMap.get(id)!;
            return {
                id,
                full_name: profile?.full_name || 'Unknown User',
                email: null,
                last_message_at: stats.last_at,
                unread_count: stats.unread
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

    async function markMessagesAsRead(userId: string) {
        // Optimistically update UI
        setChatUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, unread_count: 0 } : u
        ));

        await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_admin', false) // Only mark user messages as read
            .eq('is_read', false);
    }

    function subscribeToMessages(userId: string) {
        const channel = supabase
            .channel(`admin-chat-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMessage = payload.new as Message;
                        setMessages((prev) => {
                            if (prev.some(m => m.id === newMessage.id)) return prev;
                            return [...prev, newMessage];
                        });
                        // If we are viewing this chat, mark as read immediately
                        if (!newMessage.is_admin) {
                            markMessagesAsRead(userId);
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old.id;
                        setMessages(prev => prev.filter(m => m.id !== deletedId));
                    }
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
                    user_id: selectedUserId,
                    message: messageToSend,
                    is_admin: true,
                    is_read: false
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

    async function handleDeleteMessage(messageId: string) {
        if (!confirm('Delete this message?')) return;

        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            toast({
                variant: "destructive",
                title: "Error deleting message",
                description: error.message,
            });
        } else {
            setMessages(prev => prev.filter(m => m.id !== messageId));
        }
    }

    async function handleDeleteChat() {
        if (!selectedUserId) return;
        if (!confirm('Are you sure you want to delete this ENTIRE conversation? This cannot be undone.')) return;

        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('user_id', selectedUserId);

        if (error) {
            toast({
                variant: "destructive",
                title: "Error deleting chat",
                description: error.message,
            });
        } else {
            toast({
                title: "Chat deleted",
                description: "Conversation has been cleared.",
            });
            setMessages([]);
            fetchChatUsers(); // Refresh list
            setSelectedUserId(null);
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
                                className={`w-full text-left p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative ${selectedUserId === user.id ? 'bg-white dark:bg-gray-800 border-l-4 border-blue-600' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User className="h-4 w-4 text-gray-500" />
                                        </div>
                                        {user.unread_count > 0 && (
                                            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className={`font-medium text-sm truncate ${user.unread_count > 0 ? 'font-bold text-black dark:text-white' : ''}`}>
                                                {user.full_name}
                                            </p>
                                            {user.unread_count > 0 && (
                                                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded-full font-bold">
                                                    {user.unread_count}
                                                </span>
                                            )}
                                        </div>
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
                            <Button variant="ghost" size="sm" onClick={handleDeleteChat} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Chat
                            </Button>
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
                                        className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'} group`}
                                    >
                                        <div className={`flex items-end gap-2 ${msg.is_admin ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div
                                                className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.is_admin
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white dark:bg-gray-700 border shadow-sm'
                                                    }`}
                                            >
                                                <p>{msg.message}</p>
                                                <div className="flex items-center justify-between gap-4 mt-1">
                                                    <span className={`text-[10px] ${msg.is_admin ? 'text-blue-100' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {msg.is_admin && (
                                                        <span className="text-[10px] text-blue-200">
                                                            {msg.is_read ? 'Read' : 'Sent'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Delete Message Button (Visible on Hover) */}
                                            <button
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500"
                                                title="Delete message"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
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
