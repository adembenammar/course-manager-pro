-- Direct messages between users
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Users can see messages they sent or received
create policy "Users see their messages"
on public.messages
for select
using (
  sender_id in (select id from public.profiles where user_id = auth.uid())
  or recipient_id in (select id from public.profiles where user_id = auth.uid())
);

-- Only allow insert as the authenticated sender
create policy "Users send messages as themselves"
on public.messages
for insert
with check (
  sender_id in (select id from public.profiles where user_id = auth.uid())
);

-- Allow recipients to mark messages as read
create policy "Recipients can mark read"
on public.messages
for update
using (
  recipient_id in (select id from public.profiles where user_id = auth.uid())
)
with check (
  recipient_id in (select id from public.profiles where user_id = auth.uid())
);

-- Optional: allow deletion by sender or recipient
create policy "Participants can delete messages"
on public.messages
for delete
using (
  sender_id in (select id from public.profiles where user_id = auth.uid())
  or recipient_id in (select id from public.profiles where user_id = auth.uid())
);

-- Realtime on messages
alter publication supabase_realtime add table public.messages;

-- Indexes to speed up lookups
create index messages_sender_idx on public.messages(sender_id, created_at desc);
create index messages_recipient_idx on public.messages(recipient_id, created_at desc);
