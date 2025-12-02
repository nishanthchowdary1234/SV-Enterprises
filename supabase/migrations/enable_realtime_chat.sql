-- Enable Realtime for chat_messages table
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table chat_messages;
