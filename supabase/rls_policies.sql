-- DormEats RLS 정책 전체 적용 스크립트
-- Supabase Dashboard > SQL Editor 에서 전체를 한 번에 실행하세요.
-- (service_role 키로도 DDL은 실행할 수 없어 SQL Editor에서만 적용 가능합니다.)

begin;

-- ============================================================
-- users: id/nickname/dorm 외 컬럼(email, role 등)은 anon/authenticated에게 완전히 숨김
-- INSERT는 아래 handle_new_user() 트리거가 SECURITY DEFINER로 처리하므로
-- anon/authenticated용 INSERT 정책은 만들지 않음
-- ============================================================
alter table users enable row level security;

revoke all on users from anon, authenticated;
grant select (id, nickname, dorm) on users to anon, authenticated;

create policy "users_select_public_columns"
  on users for select
  to anon, authenticated
  using (true);

-- 회원가입 시 auth.users에 새 행이 생기면 public.users 프로필을 자동 생성
-- signUp()이 이메일 인증 대기 상태(session=null)로 반환되는 동안에도
-- auth.uid()에 의존하지 않고 안전하게 프로필을 만들기 위한 장치
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, nickname)
  values (new.id, new.raw_user_meta_data ->> 'nickname');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- posts: 조회는 전체 공개, 작성/삭제는 본인만, like_count만 누구나 갱신 가능
-- (수정 기능 자체가 없으므로 title/content 등은 UPDATE 권한을 아예 부여하지 않음)
-- ============================================================
alter table posts enable row level security;

revoke all on posts from anon, authenticated;
grant select on posts to anon, authenticated;
grant insert, delete on posts to authenticated;
grant update (like_count) on posts to authenticated;

create policy "posts_select_all"
  on posts for select
  to anon, authenticated
  using (true);

create policy "posts_insert_own"
  on posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "posts_delete_own"
  on posts for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "posts_update_like_count"
  on posts for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- comments: 조회 전체 공개, 작성/삭제는 본인만 (기존엔 삭제가 클라이언트 체크뿐이었음)
-- ============================================================
alter table comments enable row level security;

revoke all on comments from anon, authenticated;
grant select on comments to anon, authenticated;
grant insert, delete on comments to authenticated;

create policy "comments_select_all"
  on comments for select
  to anon, authenticated
  using (true);

create policy "comments_insert_own"
  on comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "comments_delete_own"
  on comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- reviews: 조회 전체 공개, 작성만 본인 명의로 (수정/삭제 기능 없음)
-- ============================================================
alter table reviews enable row level security;

revoke all on reviews from anon, authenticated;
grant select on reviews to anon, authenticated;
grant insert on reviews to authenticated;

create policy "reviews_select_all"
  on reviews for select
  to anon, authenticated
  using (true);

create policy "reviews_insert_own"
  on reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================
-- likes: 완전히 본인 소유 (조회/작성/삭제 모두 자기 것만, 비로그인 접근 불가)
-- ============================================================
alter table likes enable row level security;

revoke all on likes from anon, authenticated;
grant select, insert, delete on likes to authenticated;

create policy "likes_select_own"
  on likes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "likes_insert_own"
  on likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "likes_delete_own"
  on likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- favorites: likes와 동일한 패턴
-- ============================================================
alter table favorites enable row level security;

revoke all on favorites from anon, authenticated;
grant select, insert, delete on favorites to authenticated;

create policy "favorites_select_own"
  on favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "favorites_delete_own"
  on favorites for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- notifications: 본인 알림만 조회/is_read 갱신 가능
-- INSERT는 actor_id 기준 (알림을 만드는 사람 = 행동을 한 사람, 받는 사람과 다름)
-- ============================================================
alter table notifications enable row level security;

revoke all on notifications from anon, authenticated;
grant select on notifications to authenticated;
grant insert on notifications to authenticated;
grant update (is_read) on notifications to authenticated;

create policy "notifications_select_own"
  on notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notifications_insert_as_actor"
  on notifications for insert
  to authenticated
  with check (auth.uid() = actor_id);

create policy "notifications_update_own_is_read"
  on notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- deleted_comments_log / deleted_posts_log: 삭제 백업용 감사 로그
-- 클라이언트는 쓰기만 하고 절대 읽지 않음 (조회는 service_role 전용, 정책 없음 = 차단)
-- ============================================================
alter table deleted_comments_log enable row level security;

revoke all on deleted_comments_log from anon, authenticated;
grant insert on deleted_comments_log to authenticated;

create policy "deleted_comments_log_insert_own"
  on deleted_comments_log for insert
  to authenticated
  with check (auth.uid() = user_id);

alter table deleted_posts_log enable row level security;

revoke all on deleted_posts_log from anon, authenticated;
grant insert on deleted_posts_log to authenticated;

create policy "deleted_posts_log_insert_own"
  on deleted_posts_log for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================
-- meals / meal_items / menu_items: 전체 공개 조회, 쓰기는 크롤러(service_role)만
-- 세 테이블 모두 개별적으로 RLS를 통과해야 하므로 (중첩 embed 쿼리) 셋 다 명시
-- ============================================================
alter table meals enable row level security;

revoke all on meals from anon, authenticated;
grant select on meals to anon, authenticated;

create policy "meals_select_all"
  on meals for select
  to anon, authenticated
  using (true);

alter table meal_items enable row level security;

revoke all on meal_items from anon, authenticated;
grant select on meal_items to anon, authenticated;

create policy "meal_items_select_all"
  on meal_items for select
  to anon, authenticated
  using (true);

alter table menu_items enable row level security;

revoke all on menu_items from anon, authenticated;
grant select on menu_items to anon, authenticated;

create policy "menu_items_select_all"
  on menu_items for select
  to anon, authenticated
  using (true);

-- ============================================================
-- 익명 작성자 노출 방지
-- posts.user_id / comments.user_id / notifications.actor_id는
-- users.email과 동일하게 컬럼 단위로 완전히 숨기고,
-- 대신 posts_view/comments_view/notifications_view가
-- is_owner(boolean)와 마스킹된 닉네임만 노출한다.
-- ============================================================

-- 컬럼 단위 REVOKE (앞서 부여한 select on posts/comments 전체 권한을 좁힘)
revoke select on posts from anon, authenticated;
grant select (id, board_type, category, title, content, is_anonymous, like_count, created_at)
  on posts to anon, authenticated;

revoke select on comments from anon, authenticated;
grant select (id, post_id, content, is_anonymous, created_at)
  on comments to anon, authenticated;

revoke select on notifications from authenticated;
grant select (id, user_id, type, post_id, is_read, created_at)
  on notifications to authenticated;

-- 알림 생성 시점의 익명 여부를 기록해, 알림에서도 익명이면 실명이 안 보이게 함
alter table notifications add column if not exists is_anonymous boolean not null default false;

-- 읽기 전용 뷰: 원본 user_id/actor_id 대신 is_owner + 마스킹된 닉네임만 노출
create view posts_view as
select
  p.id, p.board_type, p.category, p.title, p.content,
  p.is_anonymous, p.like_count, p.created_at,
  coalesce(auth.uid() = p.user_id, false) as is_owner,
  case when p.is_anonymous then null else u.nickname end as author_nickname
from posts p
left join users u on u.id = p.user_id;

create view comments_view as
select
  c.id, c.post_id, c.content, c.is_anonymous, c.created_at,
  coalesce(auth.uid() = c.user_id, false) as is_owner,
  case when c.is_anonymous then null else u.nickname end as author_nickname,
  p.title as post_title,
  p.board_type as post_board_type
from comments c
left join users u on u.id = c.user_id
left join posts p on p.id = c.post_id;

create view notifications_view as
select
  n.id, n.type, n.post_id, n.is_read, n.created_at,
  case when n.is_anonymous then null else u.nickname end as actor_nickname,
  p.title as post_title,
  p.board_type as post_board_type
from notifications n
left join users u on u.id = n.actor_id
left join posts p on p.id = n.post_id
where n.user_id = auth.uid();

grant select on posts_view, comments_view to anon, authenticated;
grant select on notifications_view to authenticated;

-- RPC: 글 소유자를 서버측에서 조회해 알림 생성 (클라이언트는 실제 user_id를 몰라도 됨)
create or replace function public.notify_post_owner(
  p_post_id uuid,
  p_notif_type text,
  p_is_anonymous boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select user_id into v_owner_id from posts where id = p_post_id;

  if v_owner_id is null or v_owner_id = auth.uid() then
    return;
  end if;

  insert into notifications (user_id, actor_id, type, post_id, is_anonymous)
  values (v_owner_id, auth.uid(), p_notif_type, p_post_id, p_is_anonymous);
end;
$$;

grant execute on function public.notify_post_owner(uuid, text, boolean) to authenticated;

-- RPC: 본인 글 삭제 (소유권 확인 + 감사 로그 백업 + 삭제를 한 번에 처리)
create or replace function public.delete_own_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post posts%rowtype;
begin
  select * into v_post from posts where id = p_post_id;

  if v_post.id is null then
    raise exception 'post not found';
  end if;

  if v_post.user_id != auth.uid() then
    raise exception 'not authorized';
  end if;

  insert into deleted_posts_log (
    original_post_id, user_id, board_type, category, title, content, is_anonymous
  ) values (
    v_post.id, v_post.user_id, v_post.board_type, v_post.category,
    v_post.title, v_post.content, v_post.is_anonymous
  );

  delete from posts where id = p_post_id;
end;
$$;

grant execute on function public.delete_own_post(uuid) to authenticated;

-- RPC: 본인 댓글 삭제 (delete_own_post와 동일 패턴)
create or replace function public.delete_own_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment comments%rowtype;
begin
  select * into v_comment from comments where id = p_comment_id;

  if v_comment.id is null then
    raise exception 'comment not found';
  end if;

  if v_comment.user_id != auth.uid() then
    raise exception 'not authorized';
  end if;

  insert into deleted_comments_log (
    original_comment_id, post_id, user_id, content, is_anonymous
  ) values (
    v_comment.id, v_comment.post_id, v_comment.user_id, v_comment.content, v_comment.is_anonymous
  );

  delete from comments where id = p_comment_id;
end;
$$;

grant execute on function public.delete_own_comment(uuid) to authenticated;

commit;
