-- migrate:up

-- Seed admin users. WARNING: the default password lives in the repo and is
-- applied to every environment (incl. prod) by CI. Change it after first login.
do $$
declare
  emails text[] := array[
    'amir@roadmate.com',
    'petar@roadmate.com',
    'igor@roadmate.com'
  ];
  e text;
  uid uuid;
begin
  foreach e in array emails loop
    select id into uid from auth.users where email = e;

    if uid is null then
      uid := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token,
        email_change, email_change_token_new
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated',
        'authenticated', e, extensions.crypt('Admin123!', extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', initcap(split_part(e, '@', 1))),
        '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid,
        jsonb_build_object('sub', uid::text, 'email', e),
        'email', e, now(), now(), now()
      );
    end if;

    insert into rbac.user_role (user_id, role_name)
    values (uid, 'admin')
    on conflict do nothing;
  end loop;
end $$;

-- migrate:down

delete from auth.users
where email in ('amir@roadmate.com', 'petar@roadmate.com', 'igor@roadmate.com');
