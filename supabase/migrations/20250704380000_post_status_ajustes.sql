-- Add "ajustes" workflow state (CM requested changes after review)

alter type public.post_status add value if not exists 'ajustes';
