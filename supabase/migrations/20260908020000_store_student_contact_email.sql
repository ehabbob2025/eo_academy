-- Run once in Supabase SQL Editor to keep each student's entered email.
alter table public.profiles add column if not exists contact_email text not null default '';
