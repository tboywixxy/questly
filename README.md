# Questly — Social micro-feed with realtime comments & push notifications

A modern, mobile-first social feed built with **Expo + React Native + Supabase**. Users can post, like, and comment; post owners receive **push notifications** when others like or comment.


## 🧪 Demo / Testing

You can log in with this **test account**:

- **Email:** `demotest@gmail.com`  
- **Password:** `TESTINGdemo@123`

Prefer a fresh account? **Sign-up works** — testers can create their own account directly in the app and try posting, liking, and commenting end-to-end.
---

## ✨ Features

- **Auth & Profiles**
  - Supabase Auth (email/password)
  - Public profiles (`username`, `avatar_url`)
- **Core Social Feed**
  - Feed from `post_feed` view (text + optional media, place name)
  - Media shown **no-crop** (centered; aspect-ratio clamped for very tall/wide)
- **Engagement**
  - Likes with **optimistic UI** and haptics (rollback on failure)
  - Realtime **comments** (Supabase Realtime)
  - LeaderBoard 
  - Like-based **badges** (via `getBadge`)
- **Notifications**
  - Device tokens saved per user (`user_devices`)
  - DB triggers create `notifications` on **likes**/**comments**
  - **Direct DB → Expo** push via `pg_net` (no server needed)
  - Android notification channel (`MAX` importance), priority **high**
  - Personalized title/body with actor’s username
- **UI/UX**
  - Dark/Light theme, shared color system
  - Animated skeleton loaders (feed & notifications)
  - iOS: comments in modal; **Android: dedicated screen** for smoother UX
  - Clean header, unread badge

---

## 🧪 Demo / Testing

You can log in with this **test account**:

- **Email:** `demotest@gmail.com`  
- **Password:** `TESTINGdemo@123`

Prefer a fresh account? **Sign-up works** — testers can create their own account directly in the app and try posting, liking, and commenting end-to-end.

---

## 🛠️ Tech Stack

- **Expo + React Native** (`expo-router`, `expo-notifications`)
- **Supabase** (Auth, Postgres, Realtime, RLS)
- **pg_net** (HTTP from Postgres → Expo Push API)
- **Ionicons**, **Animated API** for motion/skeletons

---

## 📦 Project Structure (high-level)

```
app/
  (tabs)/index.tsx         # Home/Feed (likes, list, open comments)
  notifications.tsx        # In-app notifications list
  comment/[postId].tsx     # (Android) comments screen (if you kept the split)
components/
  CommentsModal.tsx        # (iOS) comments modal
src/
  services/supabase.ts     # Supabase client
  utils/
    registerForPushNotificationsAsync.ts
    pushTokens.ts          # upsert device token
    badges.ts
    haptics.ts
assets/images/             # logos & notification icon
app.json                   # Expo config (notification icon/color set)
```

---

## ▶️ Run Locally

### 1) Prereqs
- Node 18+ and npm/yarn
- **Expo CLI** (`npm i -g expo`)
- A **Supabase** project (free tier OK)
- (Optional) **EAS CLI** for device builds (`npm i -g eas-cli`)

### 2) Env Vars

Create `.env` (or use `app.json > expo.extra`) with your **public** Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

> **Important:** If you’re cloning this repo from GitHub, **replace all keys/URLs with your own** before running. Never commit secrets.

### 3) Install & Start

```bash
npm install
npx expo start
# press i (iOS sim on macOS), a (Android), or scan QR with Expo Go
```

> Push notifications require a **physical device**. Foreground display is enabled via `Notifications.setNotificationHandler({ shouldShowAlert: true, ... })`. On Android 13+, accept the notifications permission prompt.

---

## 🗄️ Database Requirements

**Minimum tables / views used:**
- `posts (id, user_id, content, media_url, place_name, created_at)`
- `post_feed` view (posts + `like_count`, `comment_count`)
- `post_likes (post_id, user_id, created_at)` with **unique (post_id, user_id)**
- `post_comments (id, post_id, user_id, content, created_at)`
- `profiles (id, username, avatar_url)`
- `notifications (id, user_id, actor_id, post_id, type, message, read, created_at)`
- `user_devices (user_id, expo_push_token, platform, active, last_seen)`


## 🔔 Push Notifications (DB-driven, no server)

**Device token capture (app):**
- `registerForPushNotificationsAsync()` fetches Expo token
- `saveExpoPushToken(token)` upserts into `user_devices`

**Create `pg_net` push sender (DB → Expo):**

```sql
-- 1) Enable pg_net
create extension if not exists pg_net;

-- 2) Build title/body (uses actor username)
create or replace function public._notif_title_body(n public.notifications)
returns table(title text, body text)
language sql
as $$
  with actor as (select username from public.profiles where id = n.actor_id)
  select
    case n.type
      when 'like'    then coalesce((select username from actor),'Someone') || ' liked your post'
      when 'comment' then coalesce((select username from actor),'Someone') || ' commented on your post'
      else 'Notification'
    end as title,
    coalesce(nullif(n.message,''), 'Tap to view') as body
$$;

-- 3) Trigger: send to Expo on notifications insert
create or replace function public.push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dev record; t text; payload jsonb; title text; body text;
begin
  select _t.title, _t.body into title, body
  from public._notif_title_body(NEW) as _t;

  for dev in
    select expo_push_token from public.user_devices
    where user_id = NEW.user_id and active is true
  loop
    t := dev.expo_push_token;
    if t is null or length(t) < 20 then continue; end if;

    payload := jsonb_build_array(
      jsonb_build_object(
        'to', t, 'sound','default', 'priority','high', 'channelId','default',
        'title', title, 'body', body,
        'data', jsonb_build_object('type',NEW.type,'postId',NEW.post_id,'actorId',NEW.actor_id,'notificationId',NEW.id)
      )
    );

    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('accept','application/json','accept-encoding','gzip, deflate','content-type','application/json'),
      body    := payload
    );
  end loop;
  return NEW;
end
$$;

drop trigger if exists trg_push_on_notification on public.notifications;
create trigger trg_push_on_notification
after insert on public.notifications
for each row execute procedure public.push_on_notification();
```

**Create notification triggers for likes/comments** (personalized, `SECURITY DEFINER`):

```sql
-- Like → Notification
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare post_owner uuid; actor_name text;
begin
  select user_id into post_owner from public.posts where id = NEW.post_id;
  if post_owner is null or post_owner = NEW.user_id then return NEW; end if;

  select username into actor_name from public.profiles where id = NEW.user_id;

  insert into public.notifications (user_id, actor_id, post_id, type, message, read)
  values (post_owner, NEW.user_id, NEW.post_id, 'like', coalesce(actor_name,'Someone') || ' liked your post', false);

  return NEW;
end $$;

drop trigger if exists trg_notify_on_like on public.post_likes;
create trigger trg_notify_on_like
after insert on public.post_likes
for each row execute procedure public.notify_on_like();

-- Comment → Notification
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare post_owner uuid; actor_name text; snippet text;
begin
  select user_id into post_owner from public.posts where id = NEW.post_id;
  if post_owner is null or post_owner = NEW.user_id then return NEW; end if;

  select username into actor_name from public.profiles where id = NEW.user_id;
  snippet := coalesce(nullif(trim(NEW.content), ''), 'left a comment');
  snippet := left(snippet, 120);

  insert into public.notifications (user_id, actor_id, post_id, type, message, read)
  values (post_owner, NEW.user_id, NEW.post_id, 'comment', coalesce(actor_name,'Someone') || ': ' || snippet, false);

  return NEW;
end $$;

drop trigger if exists trg_notify_on_comment on public.post_comments;
create trigger trg_notify_on_comment
after insert on public.post_comments
for each row execute procedure public.notify_on_comment();
```

**Test quickly (no app code needed):**
```sql
-- Recipient must have a token
select * from public.user_devices where user_id = '<recipient-uuid>';

-- Insert a like as another user on the recipient's post
delete from public.post_likes where post_id = '<post-id>' and user_id = '<actor-uuid>';
insert into public.post_likes (post_id, user_id) values ('<post-id>', '<actor-uuid>');

-- Should see a notifications row + get a push
select * from public.notifications order by created_at desc limit 5;
```

---

## 📱 Build (Optional but Recommended)

- **Android**: `eas build -p android --profile preview`  
- **iOS**: `eas build -p ios --profile production` (or `preview`/`development`)  
- Submit to TestFlight: `eas submit -p ios --latest`

**Android small icon** is set in `app.json`:
```json
"notification": { "icon": "./assets/images/logo-rm-bg-light.png", "color": "#2563EB" },
"android": { "notification": { "icon": "./assets/images/logo-rm-bg-light.png", "color": "#2563EB" } }
```
> Use a **white-on-transparent** PNG for the best look; rebuild with EAS to apply.



## 🧩 How this meets the brief

- **Original work** with open-source acknowledgements
- **Links-only submission** (repo + optional demo build link)
- **Runs without errors**; README covers setup/run/test
- **Code quality**: modular components, typed props, consistent naming, theme utils
- **Core functionality**: auth, profiles, feed, likes, comments
- **Engagement**: realtime comments, badges, push notifications
- **Modern UI/UX**: dark/light theme, skeletons, motion

---

## 🙏 Acknowledgements

- [Expo](https://expo.dev/) & [Expo Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Supabase](https://supabase.com/) (`@supabase/supabase-js`, Realtime, Auth)
- [pg_net](https://supabase.com/docs/guides/database/extensions/pg-net)
- Ionicons

---

## 🐛 Troubleshooting

- **No push on device**
  - Ensure a device token row exists for the recipient (`user_devices`)
  - Android 13+: grant POST_NOTIFICATIONS
  - Foreground: `shouldShowAlert: true` in notification handler
- **Like doesn’t notify**
  - Unique clash on `(post_id, user_id)` blocks insert → delete then re-like
  - Verify `trg_notify_on_like` & `trg_push_on_notification` are attached
- **Icon looks odd on Android**
  - Use a white-on-transparent PNG and rebuild with EAS
