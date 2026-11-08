CREATE OR REPLACE FUNCTION public.studio_photo_limit_for(_user uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_email text;
  v_plan text;
begin
  select lower(coalesce(u.email, '')) into v_email from auth.users u where u.id = _user;

  -- VIP: teto de 300 fotos somando todas as marcas da conta.
  if exists (select 1 from public.vip_users v where lower(v.email) = v_email)
     or v_email in ('gvallimoliveira@gmail.com', 'gvallim.fisio@gmail.com') then
    return 300;
  end if;

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
$function$;