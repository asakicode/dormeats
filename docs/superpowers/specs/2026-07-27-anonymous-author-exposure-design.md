# 익명 게시글/댓글 작성자 노출 문제 해결 설계

- 날짜: 2026-07-27
- 관련 이슈: RLS 정책 작업(`supabase/rls_policies.sql`) 중 발견됨

## 배경

`is_anonymous: true`로 작성된 게시글/댓글도, 클라이언트가 Supabase에서 조회하는
API 응답에는 실제 작성자 정보가 그대로 담겨 있다. UI는 `is_anonymous`가 true일 때
"익명"이라고만 렌더링할 뿐, 그 판단은 클라이언트 렌더링 단계에서만 이루어진다.
즉 네트워크 탭이나 REST 엔드포인트를 직접 열어보면 익명 처리된 글/댓글의 실제
작성자를 알아낼 수 있다.

조사 결과 확인된 노출 지점은 세 곳이다.

1. **게시글/댓글 상세 조회**: `LikeButton`/`DeletePostButton`이 작성자 판별을 위해
   `authorId`(=`posts.user_id`)를 그대로 prop으로 받고, 이 값은 페이지가 Supabase에서
   `select`할 때 그대로 딸려온다. 또한 `users ( nickname )`도 `is_anonymous`와
   무관하게 항상 함께 조회된다 (`app/board/[id]/page.tsx`,
   `app/free-board/[id]/page.tsx`, `CommentSection.tsx`).
2. **게시글 목록 조회**: `user_id`는 안 보내지만 `users ( nickname )`은 마찬가지로
   항상 함께 조회된다 (`app/board/page.tsx`, `app/free-board/page.tsx`).
3. **알림**: `NotificationBell.tsx`가 `actor:actor_id ( nickname )`을 항상 join해서
   보여준다. 즉 누군가 익명으로 좋아요/댓글을 남겨도, 그 글 작성자는 알림에서
   실제 행위자의 닉네임을 그대로 볼 수 있다. 이는 게시글 작성자 본인에게
   익명성이 전혀 지켜지지 않는다는 뜻이라, 원래 지적된 문제보다 더 직접적인
   익명성 붕괴다.

세 지점 모두 근본 원인이 같다: **서버가 실제 신원 데이터(user_id, nickname)를
그대로 응답에 담아 보내고, 클라이언트가 화면에서만 조건부로 숨긴다.** 따라서
해결 방식도 동일한 패턴(뷰 + RPC)으로 통일한다.

추가로, 이번 조사 중 `posts.user_id`/`comments.user_id`를 REVOKE하면
`app/mypage/page.tsx`가 `.eq('user_id', user.id)`로 "내 글"/"내 댓글"을 직접
필터링하고 있어 함께 깨진다는 것을 확인했다. 이 페이지 수정도 이번 설계에 필수로
포함한다.

## 목표

- 익명 게시글/댓글의 실제 작성자 user_id와 nickname이 API 응답 어디에도
  노출되지 않게 한다 (작성자 본인이 조회하는 경우 제외 없이, `is_anonymous`가
  true면 그 즉시 누구에게도 실명이 보이지 않아야 한다).
- 익명으로 남긴 좋아요/댓글에 대한 알림에서도 행위자의 실명이 노출되지 않게 한다.
- 삭제 버튼 노출 여부, "내 글/내 댓글" 판별 등 소유권 기반 UI 로직은 계속
  동작해야 한다 (원본 user_id 없이 `is_owner` boolean만으로 판별).
- 기존 아키텍처(클라이언트가 Supabase를 직접 호출, 별도 백엔드 API 레이어 없음)를
  유지한다. `handle_new_user()` 트리거와 동일하게 Postgres 뷰/`SECURITY DEFINER`
  RPC로 서버측 로직을 구현한다.

## 비목표

- 좋아요 자체에 익명 옵션을 추가하는 것은 범위 밖이다 (현재 좋아요는 애초에
  익명 개념이 없고, 이 설계에서도 추가하지 않는다. `notify_post_owner` RPC
  호출 시 좋아요는 `p_is_anonymous`를 넘기지 않아 기본값 false로 항상
  실명이 노출되며, 이는 기존과 동일한 의도된 동작이다).
- `like_count` 갱신 방식의 동시성/레이스 컨디션 문제는 이번 설계에서 다루지
  않는다 (발견했지만 이번 이슈와 무관한 별도 사안).

## 설계

### 1. DB 변경 (`supabase/rls_policies.sql`에 이어서 추가)

**컬럼 단위 REVOKE 확장**: `posts.user_id`, `comments.user_id`,
`notifications.actor_id` 컬럼의 SELECT 권한을 `anon`/`authenticated`에서
제거한다. `users.email`을 숨길 때 쓴 것과 동일한 패턴이다.

**읽기 전용 뷰 3개**: 원본 user_id/actor_id 컬럼 대신 안전한 파생 컬럼만
노출한다. 뷰는 소유자 권한으로 실행되므로, REVOKE와 무관하게 뷰 정의 내부에서는
user_id/actor_id를 읽어 `is_owner`/닉네임 마스킹을 계산할 수 있다.

```sql
create view posts_view as
select
  p.id, p.board_type, p.category, p.title, p.content,
  p.is_anonymous, p.like_count, p.created_at,
  coalesce(auth.uid() = p.user_id, false) as is_owner,
  case when p.is_anonymous then null else u.nickname end as author_nickname
from posts p left join users u on u.id = p.user_id;

create view comments_view as
select
  c.id, c.post_id, c.content, c.is_anonymous, c.created_at,
  coalesce(auth.uid() = c.user_id, false) as is_owner,
  case when c.is_anonymous then null else u.nickname end as author_nickname
from comments c left join users u on u.id = c.user_id;

create view notifications_view as
select
  n.id, n.type, n.post_id, n.is_read, n.created_at,
  case when n.is_anonymous then null else u.nickname end as actor_nickname
from notifications n left join users u on u.id = n.actor_id
where n.user_id = auth.uid();

grant select on posts_view, comments_view, notifications_view
  to anon, authenticated;
```

`notifications_view`는 `where n.user_id = auth.uid()`로 본인 알림만 노출한다
(기존 `notifications_select_own` 정책과 동일한 제약을 뷰 자체에도 걸어,
`anon`이 다른 사람 알림을 긁어가지 못하게 한다).

**스키마 변경**: `notifications`에 `is_anonymous boolean not null default false`
컬럼을 추가한다. 알림 생성 시점(RPC 내부)에 원본 좋아요/댓글의 익명 여부를
기록해두고, `notifications_view`가 이 값을 기준으로 `actor_nickname`을
마스킹한다.

**RPC 3개 (`SECURITY DEFINER`)**:

- `notify_post_owner(post_id uuid, notif_type text, p_is_anonymous boolean default false)`
  — 서버측에서 실제 글 소유자를 조회하고, `auth.uid() != owner`일 때만
  `notifications`에 insert (`is_anonymous` 값도 함께 기록). 클라이언트는
  `post_id`와 알림 타입만 넘기면 되고, 글 소유자의 실제 user_id를 전혀 몰라도 된다.
- `delete_own_post(post_id uuid)` — `auth.uid() = posts.user_id`인지 확인 →
  `deleted_posts_log`에 백업 insert → `posts`에서 delete, 이 세 단계를 한
  트랜잭션으로 처리한다. 기존에 클라이언트가 select → insert → delete를
  3단계로 나눠 하던 것을 대체한다 (원본 user_id 없이도 삭제 가능해짐).
- `delete_own_comment(comment_id uuid)` — 동일한 패턴을 `comments`/
  `deleted_comments_log`에 적용한다.

### 2. 클라이언트 변경

| 파일 | 변경 내용 |
|---|---|
| `LikeButton.tsx` | `authorId` prop 제거. `notifications` 직접 insert 대신 `supabase.rpc('notify_post_owner', { post_id, notif_type: 'like' })` 호출 |
| `DeletePostButton.tsx` | `authorId` prop → `isOwner: boolean` prop. select+insert+delete 3단계 대신 `supabase.rpc('delete_own_post', { post_id })` 1회 호출 |
| `CommentSection.tsx` | 댓글 목록 조회를 `comments_view`로 변경 (`is_owner`/`author_nickname` 사용). 삭제는 `supabase.rpc('delete_own_comment', { comment_id })`로 변경. 댓글 등록 후 알림은 `supabase.rpc('notify_post_owner', { post_id, notif_type: 'comment', p_is_anonymous: isAnonymous })`로 변경 |
| `app/board/[id]/page.tsx`, `app/free-board/[id]/page.tsx` | `posts` 대신 `posts_view` 조회. `is_owner`/`author_nickname`을 `LikeButton`/`DeletePostButton`/`CommentSection`에 전달 |
| `app/board/page.tsx`, `app/free-board/page.tsx` (목록) | `posts_view`로 변경해 닉네임 마스킹 적용 (원래 `user_id`는 쓰지 않았으므로 이 부분은 닉네임 노출만 막으면 됨) |
| `app/components/NotificationBell.tsx` | `notifications_view` 조회로 변경, `actor_nickname` 사용 |
| `app/mypage/page.tsx` | "내 글"/"내 댓글" 조회를 `posts_view`/`comments_view` + `.eq('is_owner', true)` 필터로 변경 (REVOKE 이후 기존 `.eq('user_id', user.id)` 필터가 동작하지 않으므로 필수) |

### 3. 검증 계획

- SQL 적용 후 `anon`/`authenticated` 키로 `posts_view`, `comments_view`,
  `notifications_view`를 직접 조회해서 응답에 원본 `user_id`/`actor_id`가
  전혀 없는지 확인하는 스크립트를 작성한다 (기존에 계획했던
  `users.email` 노출 검증 스크립트와 함께 한 스크립트로 통합).
- 익명 글 작성 → 다른 계정으로 로그인 → 네트워크 탭에서 `posts_view` 응답에
  실명/실제 id가 없는지 수동 확인.
- 익명 댓글 작성 → 글쓴이 계정으로 알림 확인 → `actor_nickname`이 `null`로
  와서 UI에 "익명"으로 표시되는지 확인.
- 삭제 버튼: 본인 글/댓글에서만 보이는지, `delete_own_post`/`delete_own_comment`
  호출 후 `deleted_posts_log`/`deleted_comments_log`에 정상적으로 백업되는지 확인.

## 리스크 / 트레이드오프

- 뷰는 읽기 전용이며 insert/update/delete는 계속 원본 테이블 또는 RPC를
  경유한다. 새 코드가 실수로 `posts`/`comments`/`notifications` 원본 테이블에
  직접 select를 시도하면 REVOKE 때문에 `user_id`/`actor_id` 컬럼을 요청하는
  즉시 권한 오류가 난다 — 이는 의도된 안전장치다.
- `notifications.actor_id`는 DB에는 계속 남아 있으므로 (닉네임만 마스킹),
  추후 어뷰징/신고 대응 시 `service_role`로 실제 행위자를 추적할 수 있다
  (`deleted_posts_log`/`deleted_comments_log`와 동일한 감사 철학).
- 이번 SQL도 기존 `supabase/rls_policies.sql`이 아직 실제 Supabase에
  적용됐는지 여부와 무관하게, 같은 파일에 이어서 추가해 한 번에
  SQL Editor에서 실행하는 것을 전제로 한다.
