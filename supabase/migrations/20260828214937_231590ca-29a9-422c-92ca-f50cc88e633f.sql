create or replace function public.studio_photo_limit_for(_user uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_plan text;
begin
  select lower(coalesce(u.email, '')) into v_email from auth.users u where u.id = _user;

  -- VIP (whitelist local + tabela) recebe o teto de agência.
  if exists (select 1 from public.vip_users v where lower(v.email) = v_email)
     or v_email in ('gvallimoliveira@gmail.com', 'gvallim.fisio@gmail.com') then
    return 120;
  end if;

  -- Acesso cortesia concedido por VIP.
  select g.plan into v_plan
  from public.studio_granted_access g
  where lower(g.email) = v_email and g.revoked_at is null
  limit 1;

  if v_plan is null then
    select c.plan into v_plan from public.studio_credits c where c.user_id = _user;
  end if;

  return case coalesce(v_plan, 'free')
    when 'solo' then 20
    when 'marca' then 60
    when 'agencia' then 120
    else 0
  end;
end;
$$;

create or replace function public.studio_photos_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  v_limit := public.studio_photo_limit_for(new.owner_id);
  select count(*) into v_count from public.studio_photos where owner_id = new.owner_id;

  if v_count >= v_limit then
    if v_limit = 0 then
      raise exception 'O acervo de fotos faz parte dos planos assinados do Studio.';
    else
      raise exception 'Seu plano permite % fotos no acervo. Remova alguma ou faça upgrade.', v_limit;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists studio_photos_limit on public.studio_photos;
create trigger studio_photos_limit
before insert on public.studio_photos
for each row execute function public.studio_photos_enforce_limit();