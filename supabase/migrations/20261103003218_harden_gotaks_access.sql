-- GoTaks: audited access control, serialized transitions, and contribution history.
-- Existing application tables must be installed first (baseline_gotaks).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create index if not exists idx_groups_creator on public.groups(dibuat_oleh);
create index if not exists idx_tasks_assignee on public.tasks(dikerjakan_oleh);
create unique index if not exists idx_one_leader_per_group on public.group_members(group_id) where role = 'ketua';

alter table public.tasks alter column group_id set not null;
alter table public.profiles add constraint profiles_name_valid check (length(btrim(nama)) between 1 and 120);
alter table public.groups add constraint groups_name_valid check (length(btrim(nama)) between 3 and 120);
alter table public.tasks add constraint tasks_title_valid check (length(btrim(judul)) between 1 and 200);
alter table public.tasks add column submitted_at timestamptz;
-- Legacy done rows only have approval time; use that as their conservative fallback.
update public.tasks set submitted_at = coalesce(selesai_at, now()) where status in ('under_review','done');
alter table public.tasks add constraint tasks_workflow_valid check (
  (status = 'draft' and dikerjakan_oleh is null and not dikunci and diterbitkan_at is null and diambil_at is null and submitted_at is null and selesai_at is null)
  or (status = 'todo' and dikerjakan_oleh is null and not dikunci and diterbitkan_at is not null and diambil_at is null and submitted_at is null and selesai_at is null)
  or (status = 'doing' and dikerjakan_oleh is not null and not dikunci and diterbitkan_at is not null and diambil_at is not null and submitted_at is null and selesai_at is null)
  or (status = 'under_review' and dikerjakan_oleh is not null and not dikunci and diterbitkan_at is not null and diambil_at is not null and submitted_at is not null and selesai_at is null)
  or (status = 'done' and dikerjakan_oleh is not null and dikunci and diterbitkan_at is not null and diambil_at is not null and submitted_at is not null and selesai_at is not null)
);


create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into profiles (id, nama, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data->>'nama'), ''),
      nullif(split_part(new.email, '@', 1), ''), 'User'
    ), 120),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.is_member(gid uuid)
returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function private.is_ketua(gid uuid)
returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and role = 'ketua'
  );
$$;

create or replace function private.buat_grup(nama_grup text)
returns groups
language plpgsql security definer set search_path = public, pg_temp as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  if length(trim(coalesce(nama_grup, ''))) not between 3 and 120 then raise exception 'Nama grup minimal 3 karakter'; end if;

  insert into groups (nama, dibuat_oleh)
  values (trim(nama_grup), auth.uid())
  returning * into g;

  insert into group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'ketua');

  return g;
end;
$$;

create or replace function private.gabung_grup(kode text)
returns groups
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  g      groups;
  jumlah int;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;

  select * into g from groups where kode_undangan = lower(trim(kode)) for update;
  if g.id is null then raise exception 'Kode undangan tidak valid'; end if;

  if exists (
    select 1 from group_members
    where group_id = g.id and user_id = auth.uid()
  ) then raise exception 'Kamu sudah anggota grup ini'; end if;

  select count(*) into jumlah from group_members where group_id = g.id;
  if jumlah >= 5 then raise exception 'Grup sudah penuh (maksimal 5 anggota)'; end if;

  insert into group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'member');

  return g;
end;
$$;

create or replace function private.keluar_grup(gid uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  jumlah_anggota int;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  perform 1 from groups where id = gid for update;
  if not private.is_member(gid) then raise exception 'Bukan anggota grup'; end if;
  select count(*) into jumlah_anggota from group_members where group_id = gid;

  if private.is_ketua(gid) and jumlah_anggota > 1 then
    raise exception 'Ketua tidak bisa keluar selama masih ada anggota lain di grup';
  end if;

  update tasks
  set status = 'todo', dikerjakan_oleh = null, diambil_at = null, submitted_at = null, catatan_revisi = null
  where group_id = gid
    and dikerjakan_oleh = auth.uid()
    and status in ('doing', 'under_review');

  delete from group_members
  where group_id = gid and user_id = auth.uid();

  if not exists (select 1 from group_members where group_id = gid) then
    delete from groups where id = gid;
  end if;
end;
$$;

create or replace function private.kirim_tugas(gid uuid)
returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  jumlah_anggota int;
  jumlah_draft   int;
  jumlah_dikirim int;
begin
  perform 1 from groups where id = gid for update;
  if not private.is_ketua(gid) then raise exception 'Hanya ketua yang bisa mengirim tugas'; end if;

  select count(*) into jumlah_anggota from group_members where group_id = gid;
  if jumlah_anggota < 2 then raise exception 'Minimal 2 anggota sebelum tugas bisa dikirim'; end if;

  select count(*) into jumlah_draft from tasks where group_id = gid and status = 'draft';
  if jumlah_draft = 0 then raise exception 'Tidak ada tugas draft untuk dikirim'; end if;

  update tasks
  set status = 'todo', diterbitkan_at = now()
  where group_id = gid and status = 'draft';

  get diagnostics jumlah_dikirim = row_count;
  return jumlah_dikirim;
end;
$$;

create or replace function private.ambil_tugas(tid uuid)
returns tasks
language plpgsql security definer set search_path = public, pg_temp as $$
declare t tasks; task_gid uuid;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;

  select group_id into task_gid from tasks where id = tid;
  perform 1 from groups where id = task_gid for update;
  select * into t from tasks where id = tid for update;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not private.is_member(t.group_id) then raise exception 'Kamu bukan anggota grup ini'; end if;
  if t.status <> 'todo' then raise exception 'Tugas ini tidak bisa diambil'; end if;
  if t.dikunci then raise exception 'Tugas ini dikunci'; end if;

  update tasks
  set status = 'doing', dikerjakan_oleh = auth.uid(),
      diambil_at = now(), catatan_revisi = null
  where id = tid
  returning * into t;

  return t;
end;
$$;

create or replace function private.selesaikan_tugas(tid uuid)
returns tasks
language plpgsql security definer set search_path = public, pg_temp as $$
declare t tasks; task_gid uuid;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  select group_id into task_gid from tasks where id = tid;
  perform 1 from groups where id = task_gid for update;
  select * into t from tasks where id = tid for update;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not private.is_member(t.group_id) then raise exception 'Kamu bukan anggota grup ini'; end if;
  if t.status <> 'doing' then raise exception 'Tugas harus berstatus doing'; end if;
  if t.dikerjakan_oleh is distinct from auth.uid() then raise exception 'Hanya pemilik tugas yang bisa menandai selesai'; end if;

  update tasks set status = 'under_review', submitted_at = now()
  where id = tid
  returning * into t;

  return t;
end;
$$;

create or replace function private.setujui_tugas(tid uuid)
returns tasks
language plpgsql security definer set search_path = public, pg_temp as $$
declare t tasks; task_gid uuid;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  select group_id into task_gid from tasks where id = tid;
  perform 1 from groups where id = task_gid for update;
  select * into t from tasks where id = tid for update;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not private.is_ketua(t.group_id) then raise exception 'Hanya ketua yang bisa menyetujui tugas'; end if;
  if t.status <> 'under_review' then raise exception 'Tugas harus berstatus under_review'; end if;

  update tasks
  set status = 'done', selesai_at = now(), dikunci = true, catatan_revisi = null
  where id = tid
  returning * into t;

  return t;
end;
$$;

create or replace function private.tolak_tugas(tid uuid, catatan text)
returns tasks
language plpgsql security definer set search_path = public, pg_temp as $$
declare t tasks; task_gid uuid;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  if length(trim(coalesce(catatan, ''))) = 0 then
    raise exception 'Catatan revisi wajib diisi saat menolak tugas';
  end if;

  select group_id into task_gid from tasks where id = tid;
  perform 1 from groups where id = task_gid for update;
  select * into t from tasks where id = tid for update;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not private.is_ketua(t.group_id) then raise exception 'Hanya ketua yang bisa menolak tugas'; end if;
  if t.status <> 'under_review' then raise exception 'Tugas harus berstatus under_review'; end if;

  update tasks
  set status = 'doing', submitted_at = null, catatan_revisi = trim(catatan)
  where id = tid
  returning * into t;

  return t;
end;
$$;

create or replace function private.lepas_tugas(tid uuid)
returns tasks
language plpgsql security definer set search_path = public, pg_temp as $$
declare t tasks; task_gid uuid;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  select group_id into task_gid from tasks where id = tid;
  perform 1 from groups where id = task_gid for update;
  select * into t from tasks where id = tid for update;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not private.is_member(t.group_id) then raise exception 'Kamu bukan anggota grup ini'; end if;
  if t.status <> 'doing' then raise exception 'Hanya tugas berstatus doing yang bisa dilepas'; end if;
  if t.dikerjakan_oleh is distinct from auth.uid() then raise exception 'Kamu bukan pemilik tugas ini'; end if;

  update tasks
  set status = 'todo', dikerjakan_oleh = null,
      diambil_at = null, submitted_at = null, catatan_revisi = null
  where id = tid
  returning * into t;

  return t;
end;
$$;

create or replace function private.lepas_paksa(tid uuid)
returns tasks
language plpgsql security definer set search_path = public, pg_temp as $$
declare t tasks; task_gid uuid;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  select group_id into task_gid from tasks where id = tid;
  perform 1 from groups where id = task_gid for update;
  select * into t from tasks where id = tid for update;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not private.is_ketua(t.group_id) then raise exception 'Hanya ketua yang bisa melepas paksa tugas'; end if;
  if t.status <> 'doing' then raise exception 'Hanya tugas berstatus doing yang bisa dilepas paksa'; end if;

  update tasks
  set status = 'todo', dikerjakan_oleh = null,
      diambil_at = null, submitted_at = null, catatan_revisi = null
  where id = tid
  returning * into t;

  return t;
end;
$$;

create or replace function private.buka_kembali(tid uuid)
returns tasks
language plpgsql security definer set search_path = public, pg_temp as $$
declare t tasks; task_gid uuid;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  select group_id into task_gid from tasks where id = tid;
  perform 1 from groups where id = task_gid for update;
  select * into t from tasks where id = tid for update;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not private.is_ketua(t.group_id) then raise exception 'Hanya ketua yang bisa membuka kembali tugas'; end if;
  if t.status <> 'done' then raise exception 'Hanya tugas berstatus done yang bisa dibuka kembali'; end if;

  update tasks
  set status = case when exists (select 1 from group_members where group_id = t.group_id and user_id = t.dikerjakan_oleh) then 'doing' else 'todo' end,
      dikerjakan_oleh = case when exists (select 1 from group_members where group_id = t.group_id and user_id = t.dikerjakan_oleh) then t.dikerjakan_oleh else null end,
      diambil_at = case when exists (select 1 from group_members where group_id = t.group_id and user_id = t.dikerjakan_oleh) then t.diambil_at else null end,
      dikunci = false, selesai_at = null, submitted_at = null, catatan_revisi = null
  where id = tid
  returning * into t;

  return t;
end;
$$;

create or replace function private.ringkasan_grup(gid uuid)
returns json
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare total_diterbitkan int;
begin
  if not private.is_member(gid) then raise exception 'Bukan anggota grup'; end if;

  select count(*) into total_diterbitkan
  from tasks where group_id = gid and status <> 'draft';

  return (
    select json_build_object(
      'total',           count(*) filter (where status <> 'draft'),
      'todo',            count(*) filter (where status = 'todo'),
      'doing',           count(*) filter (where status = 'doing'),
      'under_review',    count(*) filter (where status = 'under_review'),
      'done',            count(*) filter (where status = 'done'),
      'terlambat',       count(*) filter (
                           where status not in ('done','draft')
                           and deadline < (now() at time zone 'Asia/Jakarta')::date),
      'progress_persen', case when total_diterbitkan = 0 then 0
        else round(100.0 * count(*) filter (where status = 'done') / total_diterbitkan)
        end
    )
    from tasks where group_id = gid
  );
end;
$$;

create or replace function private.kontribusi_grup(gid uuid)
returns table (
  anggota_id        uuid,
  nama_anggota      text,
  role              text,
  tugas_diambil     int,
  tugas_selesai     int,
  tepat_waktu       int,
  persen_kontribusi numeric
)
language plpgsql security definer stable set search_path = public, pg_temp as $$
declare total_diterbitkan int;
begin
  if not private.is_member(gid) then raise exception 'Bukan anggota grup'; end if;

  select count(*) into total_diterbitkan
  from tasks where group_id = gid and status <> 'draft';

  return query
  select
    m.user_id,
    p.nama,
    m.role,
    count(t.id) filter (
      where t.dikerjakan_oleh = m.user_id
    )::int,
    count(t.id) filter (
      where t.dikerjakan_oleh = m.user_id and t.status = 'done'
    )::int,
    count(t.id) filter (
      where t.dikerjakan_oleh = m.user_id
        and t.status = 'done'
        and (t.deadline is null
             or (t.submitted_at at time zone 'Asia/Jakarta')::date <= t.deadline)
    )::int,
    case when total_diterbitkan = 0 then 0::numeric
      else round(
        100.0 * count(t.id) filter (
          where t.dikerjakan_oleh = m.user_id and t.status = 'done'
        ) / total_diterbitkan, 1)
    end
  from (
    select active.user_id, active.role, active.group_id from group_members active where active.group_id = gid
    union all
    select distinct old.dikerjakan_oleh, 'former'::text, old.group_id
    from tasks old
    where old.group_id = gid and old.status = 'done'
      and not exists (select 1 from group_members active where active.group_id = gid and active.user_id = old.dikerjakan_oleh)
  ) m
  join profiles p on p.id = m.user_id
  left join tasks t on t.group_id = m.group_id
  where m.group_id = gid
  group by m.user_id, p.nama, m.role
  order by 7 desc, 2;
end;
$$;


create or replace function private.can_read_profile(pid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select pid = (select auth.uid()) or exists (
    select 1 from group_members me join group_members peer using(group_id)
    where me.user_id = (select auth.uid()) and peer.user_id = pid
  ) or exists (
    select 1 from group_members me join tasks t using(group_id)
    where me.user_id = (select auth.uid()) and t.dikerjakan_oleh = pid and t.status <> 'draft'
  );
$$;

-- Public API functions delegate to validated private implementations.
-- No exposed function executes with definer privileges.

create or replace function public.buat_grup(nama_grup text)
returns groups
language sql security invoker set search_path = '' as $$ select private.buat_grup(nama_grup); $$;

create or replace function public.gabung_grup(kode text)
returns groups
language sql security invoker set search_path = '' as $$ select private.gabung_grup(kode); $$;

create or replace function public.keluar_grup(gid uuid)
returns void
language sql security invoker set search_path = '' as $$ select private.keluar_grup(gid); $$;

create or replace function public.kirim_tugas(gid uuid)
returns int
language sql security invoker set search_path = '' as $$ select private.kirim_tugas(gid); $$;

create or replace function public.ambil_tugas(tid uuid)
returns tasks
language sql security invoker set search_path = '' as $$ select private.ambil_tugas(tid); $$;

create or replace function public.selesaikan_tugas(tid uuid)
returns tasks
language sql security invoker set search_path = '' as $$ select private.selesaikan_tugas(tid); $$;

create or replace function public.setujui_tugas(tid uuid)
returns tasks
language sql security invoker set search_path = '' as $$ select private.setujui_tugas(tid); $$;

create or replace function public.tolak_tugas(tid uuid, catatan text)
returns tasks
language sql security invoker set search_path = '' as $$ select private.tolak_tugas(tid, catatan); $$;

create or replace function public.lepas_tugas(tid uuid)
returns tasks
language sql security invoker set search_path = '' as $$ select private.lepas_tugas(tid); $$;

create or replace function public.lepas_paksa(tid uuid)
returns tasks
language sql security invoker set search_path = '' as $$ select private.lepas_paksa(tid); $$;

create or replace function public.buka_kembali(tid uuid)
returns tasks
language sql security invoker set search_path = '' as $$ select private.buka_kembali(tid); $$;

create or replace function public.ringkasan_grup(gid uuid)
returns json
language sql stable security invoker set search_path = '' as $$ select private.ringkasan_grup(gid); $$;

create or replace function public.kontribusi_grup(gid uuid)
returns table (
  anggota_id        uuid,
  nama_anggota      text,
  role              text,
  tugas_diambil     int,
  tugas_selesai     int,
  tepat_waktu       int,
  persen_kontribusi numeric
)
language sql stable security invoker set search_path = '' as $$ select * from private.kontribusi_grup(gid); $$;


drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- Replace the complete known policy set, including the old direct membership deletion path.
drop policy "profil: lihat" on public.profiles;
drop policy "profil: ubah sendiri" on public.profiles;
drop policy "grup: lihat" on public.groups;
drop policy "grup: ubah" on public.groups;
drop policy "anggota: lihat" on public.group_members;
drop policy "anggota: keluar" on public.group_members;
drop policy "tugas: lihat" on public.tasks;
drop policy "tugas: tambah" on public.tasks;
drop policy "tugas: ubah" on public.tasks;
drop policy "tugas: hapus" on public.tasks;
create policy "profil: lihat" on public.profiles for select to authenticated using (private.can_read_profile(id));
create policy "profil: ubah sendiri" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "grup: lihat" on public.groups for select to authenticated using (private.is_member(id));
create policy "grup: ubah" on public.groups for update to authenticated using (private.is_ketua(id)) with check (private.is_ketua(id));
create policy "anggota: lihat" on public.group_members for select to authenticated using (private.is_member(group_id));
create policy "tugas: lihat" on public.tasks for select to authenticated using (private.is_member(group_id) and (status <> 'draft' or private.is_ketua(group_id)));
create policy "tugas: tambah" on public.tasks for insert to authenticated with check (private.is_ketua(group_id) and status = 'draft');
create policy "tugas: ubah" on public.tasks for update to authenticated using (private.is_ketua(group_id) and status = 'draft') with check (private.is_ketua(group_id) and status = 'draft');
create policy "tugas: hapus" on public.tasks for delete to authenticated using (private.is_ketua(group_id) and status = 'draft');
drop function public.handle_new_user();
drop function public.is_member(uuid);
drop function public.is_ketua(uuid);

-- Keep existing view column order: append submitted_at for backwards compatibility.
create or replace view public.tasks_view with (security_invoker = true) as
select t.id,t.group_id,t.judul,t.deskripsi,t.deadline,t.status,t.dikerjakan_oleh,
  t.catatan_revisi,t.diterbitkan_at,t.diambil_at,t.selesai_at,t.dikunci,t.created_at,
  p.nama as nama_pengerjakan,p.avatar_url as avatar_pengerjakan,
  case when t.status='done' then 'selesai' when t.deadline is null then 'tanpa_deadline'
    when t.deadline < (now() at time zone 'Asia/Jakarta')::date then 'terlambat'
    when t.deadline <= (now() at time zone 'Asia/Jakarta')::date + 2 then 'mepet' else 'aman' end as status_deadline,
  t.submitted_at
from public.tasks t left join public.profiles p on p.id=t.dikerjakan_oleh;

revoke all on public.profiles, public.groups, public.group_members, public.tasks, public.tasks_view from anon, authenticated;
grant select on public.profiles, public.groups, public.group_members, public.tasks, public.tasks_view to authenticated;
grant update(nama, avatar_url) on public.profiles to authenticated;
grant update(nama) on public.groups to authenticated;
grant insert(group_id, judul, deskripsi, deadline) on public.tasks to authenticated;
grant update(judul, deskripsi, deadline) on public.tasks to authenticated;
grant delete on public.tasks to authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to authenticated;
revoke all on function private.handle_new_user() from authenticated;
alter default privileges in schema private revoke execute on functions from public;

revoke all on function public.buat_grup(text) from public, anon;
grant execute on function public.buat_grup(text) to authenticated;

revoke all on function public.gabung_grup(text) from public, anon;
grant execute on function public.gabung_grup(text) to authenticated;

revoke all on function public.keluar_grup(uuid) from public, anon;
grant execute on function public.keluar_grup(uuid) to authenticated;

revoke all on function public.kirim_tugas(uuid) from public, anon;
grant execute on function public.kirim_tugas(uuid) to authenticated;

revoke all on function public.ambil_tugas(uuid) from public, anon;
grant execute on function public.ambil_tugas(uuid) to authenticated;

revoke all on function public.selesaikan_tugas(uuid) from public, anon;
grant execute on function public.selesaikan_tugas(uuid) to authenticated;

revoke all on function public.setujui_tugas(uuid) from public, anon;
grant execute on function public.setujui_tugas(uuid) to authenticated;

revoke all on function public.tolak_tugas(uuid, text) from public, anon;
grant execute on function public.tolak_tugas(uuid, text) to authenticated;

revoke all on function public.lepas_tugas(uuid) from public, anon;
grant execute on function public.lepas_tugas(uuid) to authenticated;

revoke all on function public.lepas_paksa(uuid) from public, anon;
grant execute on function public.lepas_paksa(uuid) to authenticated;

revoke all on function public.buka_kembali(uuid) from public, anon;
grant execute on function public.buka_kembali(uuid) to authenticated;

revoke all on function public.ringkasan_grup(uuid) from public, anon;
grant execute on function public.ringkasan_grup(uuid) to authenticated;

revoke all on function public.kontribusi_grup(uuid) from public, anon;
grant execute on function public.kontribusi_grup(uuid) to authenticated;

notify pgrst, 'reload schema';
