-- ============================================================
-- KerjaBareng — Schema Database
-- Supabase PostgreSQL
-- Jalankan urut dari atas ke bawah di SQL Editor Supabase
-- ============================================================


-- ─── BAGIAN 1: TABEL ────────────────────────────────────────

-- Profil user (dibuat otomatis saat login pertama kali)
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nama       text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Grup kerja
create table groups (
  id            uuid primary key default gen_random_uuid(),
  nama          text not null,
  kode_undangan text unique not null default substr(md5(random()::text), 1, 6),
  dibuat_oleh   uuid references profiles(id),
  created_at    timestamptz default now()
);

-- Anggota grup
create table group_members (
  group_id  uuid references groups(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade,
  role      text not null default 'member'
            check (role in ('ketua', 'member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Tugas
create table tasks (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references groups(id) on delete cascade,
  judul           text not null,
  deskripsi       text,
  deadline        date,
  status          text not null default 'draft'
                  check (status in ('draft','todo','doing','under_review','done')),
  dikerjakan_oleh uuid references profiles(id),
  catatan_revisi  text,
  diterbitkan_at  timestamptz,
  diambil_at      timestamptz,
  selesai_at      timestamptz,
  dikunci         boolean not null default false,
  created_at      timestamptz default now()
);

-- Index
create index idx_tasks_group  on tasks(group_id);
create index idx_tasks_status on tasks(group_id, status);
create index idx_members_user on group_members(user_id);

-- Trigger: buat profil otomatis saat user daftar/login pertama kali
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nama, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'nama',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();


-- ─── BAGIAN 2: ROW LEVEL SECURITY ───────────────────────────

alter table profiles      enable row level security;
alter table groups        enable row level security;
alter table group_members enable row level security;
alter table tasks         enable row level security;

-- Fungsi bantu: cek anggota grup
create or replace function is_member(gid uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- Fungsi bantu: cek ketua grup
create or replace function is_ketua(gid uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and role = 'ketua'
  );
$$;

-- Policy: profiles
create policy "profil: lihat"       on profiles for select to authenticated using (true);
create policy "profil: ubah sendiri" on profiles for update to authenticated using (id = auth.uid());

-- Policy: groups
create policy "grup: lihat" on groups for select to authenticated using (is_member(id));
create policy "grup: ubah"  on groups for update to authenticated using (is_ketua(id));

-- Policy: group_members
create policy "anggota: lihat"  on group_members for select to authenticated using (is_member(group_id));
create policy "anggota: keluar" on group_members for delete to authenticated using (user_id = auth.uid());

-- Policy: tasks
create policy "tugas: lihat" on tasks for select to authenticated
  using (is_member(group_id));
create policy "tugas: tambah" on tasks for insert to authenticated
  with check (is_ketua(group_id));
create policy "tugas: ubah"  on tasks for update to authenticated
  using (is_member(group_id));
create policy "tugas: hapus" on tasks for delete to authenticated
  using (is_ketua(group_id) and status = 'draft');


-- ─── BAGIAN 3: FUNGSI GRUP ──────────────────────────────────

-- Buat grup baru (user otomatis jadi ketua)
create or replace function buat_grup(nama_grup text)
returns groups
language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  if length(trim(nama_grup)) < 3 then raise exception 'Nama grup minimal 3 karakter'; end if;

  insert into groups (nama, dibuat_oleh)
  values (trim(nama_grup), auth.uid())
  returning * into g;

  insert into group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'ketua');

  return g;
end;
$$;

-- Gabung grup lewat kode undangan
create or replace function gabung_grup(kode text)
returns groups
language plpgsql security definer set search_path = public as $$
declare
  g      groups;
  jumlah int;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;

  select * into g from groups where kode_undangan = lower(trim(kode));
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

-- Keluar dari grup
create or replace function keluar_grup(gid uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin

  update tasks
  set status = 'todo', dikerjakan_oleh = null, diambil_at = null
  where group_id = gid
    and dikerjakan_oleh = auth.uid()
    and status = 'doing';

  delete from group_members
  where group_id = gid and user_id = auth.uid();

  if not exists (select 1 from group_members where group_id = gid) then
    delete from groups where id = gid;
  end if;
end;
$$;

-- Kirim semua draft ke anggota (hanya ketua, minimal 2 anggota)
create or replace function kirim_tugas(gid uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  jumlah_anggota int;
  jumlah_draft   int;
  jumlah_dikirim int;
begin
  if not is_ketua(gid) then raise exception 'Hanya ketua yang bisa mengirim tugas'; end if;

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


-- ─── BAGIAN 4: FUNGSI AKSI TUGAS ────────────────────────────

-- Ambil tugas (todo → doing)
create or replace function ambil_tugas(tid uuid)
returns tasks
language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;

  select * into t from tasks where id = tid;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not is_member(t.group_id) then raise exception 'Kamu bukan anggota grup ini'; end if;
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

-- Tandai selesai (doing → under_review)
create or replace function selesaikan_tugas(tid uuid)
returns tasks
language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  select * into t from tasks where id = tid;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not is_member(t.group_id) then raise exception 'Kamu bukan anggota grup ini'; end if;
  if t.status <> 'doing' then raise exception 'Tugas harus berstatus doing'; end if;
  if t.dikerjakan_oleh <> auth.uid() then raise exception 'Hanya pemilik tugas yang bisa menandai selesai'; end if;

  update tasks set status = 'under_review'
  where id = tid
  returning * into t;

  return t;
end;
$$;

-- Setujui tugas (under_review → done, dikunci)
create or replace function setujui_tugas(tid uuid)
returns tasks
language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  select * into t from tasks where id = tid;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not is_ketua(t.group_id) then raise exception 'Hanya ketua yang bisa menyetujui tugas'; end if;
  if t.status <> 'under_review' then raise exception 'Tugas harus berstatus under_review'; end if;

  update tasks
  set status = 'done', selesai_at = now(), dikunci = true, catatan_revisi = null
  where id = tid
  returning * into t;

  return t;
end;
$$;

-- Tolak tugas (under_review → doing + catatan revisi)
create or replace function tolak_tugas(tid uuid, catatan text)
returns tasks
language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  if length(trim(coalesce(catatan, ''))) = 0 then
    raise exception 'Catatan revisi wajib diisi saat menolak tugas';
  end if;

  select * into t from tasks where id = tid;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not is_ketua(t.group_id) then raise exception 'Hanya ketua yang bisa menolak tugas'; end if;
  if t.status <> 'under_review' then raise exception 'Tugas harus berstatus under_review'; end if;

  update tasks
  set status = 'doing', catatan_revisi = trim(catatan)
  where id = tid
  returning * into t;

  return t;
end;
$$;

-- Lepas tugas sendiri (doing → todo)
create or replace function lepas_tugas(tid uuid)
returns tasks
language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  select * into t from tasks where id = tid;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not is_member(t.group_id) then raise exception 'Kamu bukan anggota grup ini'; end if;
  if t.status <> 'doing' then raise exception 'Hanya tugas berstatus doing yang bisa dilepas'; end if;
  if t.dikerjakan_oleh <> auth.uid() then raise exception 'Kamu bukan pemilik tugas ini'; end if;

  update tasks
  set status = 'todo', dikerjakan_oleh = null,
      diambil_at = null, catatan_revisi = null
  where id = tid
  returning * into t;

  return t;
end;
$$;

-- Lepas paksa oleh ketua (doing → todo)
create or replace function lepas_paksa(tid uuid)
returns tasks
language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  select * into t from tasks where id = tid;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not is_ketua(t.group_id) then raise exception 'Hanya ketua yang bisa melepas paksa tugas'; end if;
  if t.status <> 'doing' then raise exception 'Hanya tugas berstatus doing yang bisa dilepas paksa'; end if;

  update tasks
  set status = 'todo', dikerjakan_oleh = null,
      diambil_at = null, catatan_revisi = null
  where id = tid
  returning * into t;

  return t;
end;
$$;

-- Buka kembali tugas done (done → doing)
create or replace function buka_kembali(tid uuid)
returns tasks
language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  select * into t from tasks where id = tid;
  if t.id is null then raise exception 'Tugas tidak ditemukan'; end if;
  if not is_ketua(t.group_id) then raise exception 'Hanya ketua yang bisa membuka kembali tugas'; end if;
  if t.status <> 'done' then raise exception 'Hanya tugas berstatus done yang bisa dibuka kembali'; end if;

  update tasks
  set status = 'doing', dikunci = false, selesai_at = null
  where id = tid
  returning * into t;

  return t;
end;
$$;


-- ─── BAGIAN 5: RINGKASAN, KONTRIBUSI, VIEW, REALTIME ────────

-- Ringkasan progres grup
create or replace function ringkasan_grup(gid uuid)
returns json
language plpgsql security definer stable set search_path = public as $$
declare total_diterbitkan int;
begin
  if not is_member(gid) then raise exception 'Bukan anggota grup'; end if;

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

-- Kontribusi per anggota
create or replace function kontribusi_grup(gid uuid)
returns table (
  anggota_id        uuid,
  nama_anggota      text,
  role              text,
  tugas_diambil     int,
  tugas_selesai     int,
  tepat_waktu       int,
  persen_kontribusi numeric
)
language plpgsql security definer stable set search_path = public as $$
declare total_diterbitkan int;
begin
  if not is_member(gid) then raise exception 'Bukan anggota grup'; end if;

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
             or (t.selesai_at at time zone 'Asia/Jakarta')::date <= t.deadline)
    )::int,
    case when total_diterbitkan = 0 then 0::numeric
      else round(
        100.0 * count(t.id) filter (
          where t.dikerjakan_oleh = m.user_id and t.status = 'done'
        ) / total_diterbitkan, 1)
    end
  from group_members m
  join profiles p on p.id = m.user_id
  left join tasks t on t.group_id = m.group_id
  where m.group_id = gid
  group by m.user_id, p.nama, m.role
  order by 7 desc, 2;
end;
$$;

-- View tugas lengkap + penanda deadline
create or replace view tasks_view with (security_invoker = true) as
select
  t.*,
  p.nama       as nama_pengerjakan,
  p.avatar_url as avatar_pengerjakan,
  case
    when t.status = 'done'   then 'selesai'
    when t.deadline is null  then 'tanpa_deadline'
    when t.deadline < (now() at time zone 'Asia/Jakarta')::date then 'terlambat'
    when t.deadline <= (now() at time zone 'Asia/Jakarta')::date + 2 then 'mepet'
    else 'aman'
  end as status_deadline
from tasks t
left join profiles p on p.id = t.dikerjakan_oleh;

-- Aktifkan realtime untuk tabel tasks
alter publication supabase_realtime add table tasks;

-- Hanya user login yang bisa memanggil fungsi
revoke execute on function
  buat_grup(text), gabung_grup(text), keluar_grup(uuid),
  kirim_tugas(uuid), ambil_tugas(uuid), selesaikan_tugas(uuid),
  setujui_tugas(uuid), tolak_tugas(uuid, text),
  lepas_tugas(uuid), lepas_paksa(uuid), buka_kembali(uuid),
  ringkasan_grup(uuid), kontribusi_grup(uuid)
from public, anon;

grant execute on function
  buat_grup(text), gabung_grup(text), keluar_grup(uuid),
  kirim_tugas(uuid), ambil_tugas(uuid), selesaikan_tugas(uuid),
  setujui_tugas(uuid), tolak_tugas(uuid, text),
  lepas_tugas(uuid), lepas_paksa(uuid), buka_kembali(uuid),
  ringkasan_grup(uuid), kontribusi_grup(uuid)
to authenticated;

-- ============================================================
-- Selesai. Semua tabel, RLS, dan fungsi sudah siap.
-- ============================================================