-- Fotos de uma marca compartilhada seguem o plano de QUEM CRIOU a marca.
-- Vale para qualquer marca do Studio: o convidado trabalha com o acervo do
-- criador, sem precisar de plano próprio.

create or replace function public.studio_brand_photo_limit(p_brand_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if p_brand_id is null then
    return public.studio_photo_limit_for(auth.uid());
  end if;
  if not public.can_access_studio_brand(p_brand_id) then
    return 0;
  end if;
  select b.user_id into v_owner from public.studio_brands b where b.id = p_brand_id;
  if v_owner is null then
    return public.studio_photo_limit_for(auth.uid());
  end if;
  return public.studio_photo_limit_for(v_owner);
end;
$$;

revoke all on function public.studio_brand_photo_limit(uuid) from anon, public;
grant execute on function public.studio_brand_photo_limit(uuid) to authenticated;

create or replace function public.studio_photos_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
  v_owner uuid;
begin
  if new.brand_id is not null then
    select b.user_id into v_owner from public.studio_brands b where b.id = new.brand_id;
  end if;
  v_owner := coalesce(v_owner, new.owner_id);

  v_limit := public.studio_photo_limit_for(v_owner);

  select count(*) into v_count
  from public.studio_photos p
  where p.owner_id = v_owner
     or p.brand_id in (select b.id from public.studio_brands b where b.user_id = v_owner);

  if v_count >= v_limit then
    if v_limit = 0 then
      raise exception 'O acervo de fotos faz parte dos planos assinados do Studio.';
    else
      raise exception 'Este acervo permite % fotos. Remova alguma ou faça upgrade do plano.', v_limit;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists studio_photos_limit on public.studio_photos;
create trigger studio_photos_limit
before insert on public.studio_photos
for each row execute function public.studio_photos_enforce_limit();