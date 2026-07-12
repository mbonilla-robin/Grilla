-- Legacy reject flow used in_design; map those posts to ajustes

update public.posts
set status = 'ajustes'
where status = 'in_design';
