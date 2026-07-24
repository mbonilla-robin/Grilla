-- Add "suspendido" workflow state (post will not publish; no design needed)

alter type public.post_status add value if not exists 'suspendido';
