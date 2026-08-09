create or replace function constitution.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, constitution
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function constitution.touch_updated_at() is 'Maintains updated_at timestamps with a fixed security search path.';