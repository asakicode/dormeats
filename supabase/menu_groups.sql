-- 메뉴 묶음: 이름이 조금씩 다른 같은 음식을 하나로 묶는다
-- Supabase Dashboard > SQL Editor 에서 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 실행 전 확인: 아래 쿼리 결과가 비어 있어야 favorites 유니크 인덱스를 만들 수 있습니다.
-- 결과가 있으면 중복 행을 먼저 지우세요.
--   select user_id, menu_item_id, count(*) from favorites group by 1, 2 having count(*) > 1;

begin;

create table if not exists menu_groups (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

alter table menu_items
  add column if not exists group_id uuid references menu_groups(id) on delete set null;

create index if not exists menu_items_group_id_idx on menu_items(group_id);

-- 빠른 연타나 실행취소로 같은 즐겨찾기가 두 번 들어가는 것 방지
create unique index if not exists favorites_user_menu_item_key on favorites(user_id, menu_item_id);

-- menu_items와 같은 정책: 전체 공개 조회, 쓰기는 service_role만
alter table menu_groups enable row level security;

revoke all on menu_groups from anon, authenticated;
grant select on menu_groups to anon, authenticated;

drop policy if exists "menu_groups_select_all" on menu_groups;
create policy "menu_groups_select_all"
  on menu_groups for select
  to anon, authenticated
  using (true);

commit;
