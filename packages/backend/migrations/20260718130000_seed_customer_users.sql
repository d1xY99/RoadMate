-- migrate:up

-- Seed regular (customer) users for demoing the request/offer loop. Mirrors the
-- admin seed pattern (auth.users + auth.identities), assigns the 'customer'
-- role, and fills the profile (vehicle) the on_auth_user_created trigger leaves
-- blank. WARNING: the default password lives in the repo and is applied to every
-- environment (incl. prod) by CI — change it after first login.
do $$
declare
  rec record;
  uid uuid;
begin
  for rec in
    select * from (values
      ('customer1@roadmate.com', 'Customer1', 'car'),
      ('customer2@roadmate.com', 'Customer2', 'suv_4x4'),
      ('customer3@roadmate.com', 'Customer3', 'van'),
      ('customer4@roadmate.com', 'Customer4', 'motorcycle'),
      ('customer5@roadmate.com', 'Customer5', 'truck')
    ) as t(email, full_name, vehicle)
  loop
    select id into uid from auth.users where email = rec.email;

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
        'authenticated', rec.email,
        extensions.crypt('Customer123!', extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', rec.full_name),
        '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid,
        jsonb_build_object('sub', uid::text, 'email', rec.email),
        'email', rec.email, now(), now(), now()
      );
    end if;

    -- The on_auth_user_created trigger already created the profile row; set the
    -- vehicle so the customer shows up complete in the admin "Customeri" view.
    update public.profiles
    set full_name = rec.full_name,
        vehicle_type = rec.vehicle
    where id = uid;

    insert into rbac.user_role (user_id, role_name)
    values (uid, 'customer')
    on conflict do nothing;
  end loop;
end $$;

-- migrate:down

delete from auth.users
where email in (
  'customer1@roadmate.com',
  'customer2@roadmate.com',
  'customer3@roadmate.com',
  'customer4@roadmate.com',
  'customer5@roadmate.com'
);
