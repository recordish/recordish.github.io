# Recordish — 메모 앱 (React + Vite)

**사이트: https://recordish.github.io/**

React + Vite로 만든 메모 웹 앱입니다. Google 계정으로 로그인하면 메모가 Firebase(Firestore)에 저장되어
어느 기기에서나 같은 메모를 볼 수 있습니다.

## 주요 기능

- **내 메모**: 메모 작성, 수정, 삭제. 로그인한 본인만 볼 수 있습니다
- **🔒 비공개 / 🌐 공개 선택**: 기본은 비공개이고, 공개로 고른 메모는 **로고(첫 화면)**와 **공개메모** 화면에 올라갑니다

## 화면

| 주소 | 이동 방법 | 보이는 메모 | 로그인하지 않으면 |
| --- | --- | --- | --- |
| `#/` | 로고(📝 Recordish) | **나와 다른 사람의 공개 메모** (최신순) | 그대로 볼 수 있음 |
| `#/mine` | **나만보기** 탭 | 내가 쓴 **비공개** 메모 | 로그인 화면으로 이동 |
| `#/public` | **공개메모** 탭 | 내가 쓴 **공개** 메모 | 로그인 화면으로 이동 |

- 메모 입력창은 **로고**와 **나만보기** 화면에 있습니다 (로그인했을 때, 기본값 비공개). 공개메모 화면은 목록만 보여줍니다
  - 메모를 쓰면 그 메모가 모이는 화면으로 이동합니다: 비공개 → **나만보기**, 공개 → **공개메모**
- 내가 쓴 메모에만 ⋮(수정/삭제) 메뉴가 붙습니다. 로고 화면에는 작성자 이름이, 비공개 메모에는 자물쇠가 보입니다
- 로고 화면의 공개 메모는 20개씩 **더 보기**로 이어서 불러옵니다
- 3줄이 넘는 긴 메모는 말줄임(…)으로 줄여 보여주고, **더보기 / 접기**로 펼치고 접을 수 있습니다

## 마이페이지 · 개인정보

- 오른쪽 위 **사람 모양 아이콘**을 누르면 **마이페이지**(`#/account`)가 열립니다
  - **내 정보**: 로그인 계정(이메일), 로그인 방법
  - **이름**: 공개 메모에 작성자로 표시됩니다. 기본값은 계정마다 자동으로 정해지는 두 단어 영어 이름(예: `Running Wolf`, 576가지, `src/utils/defaultName.js`)이고, 1~20자로 바꿀 수 있습니다.
    바꾸면 이미 쓴 내 메모의 작성자 이름도 함께 바뀝니다. **기본값으로** 버튼으로 되돌릴 수 있습니다
  - **이용 기록**: 가입일, 마지막 접속(이번 접속 바로 전), 접속 횟수(앱을 열 때마다 1, 새로고침은 세지 않음)
  - **로그아웃**, **계정 삭제**
- **계정 삭제**: 내 메모(공개·비공개 전부), 프로필, 하루 사용량, 예전 위치 메모, 로그인 계정을 모두 즉시 삭제합니다 (`deleteAccount`, `deleteAllMyData`)
  - Firebase가 최근 로그인을 요구하면 Google 로그인 창을 한 번 더 띄운 뒤 삭제합니다
- **개인정보처리방침**: https://recordish.github.io/privacy.html (`public/privacy.html`, 로그인 없이 볼 수 있는 정적 페이지)
  - 계정·데이터 삭제 안내: https://recordish.github.io/privacy.html#delete
  - ⚠️ **문의 이메일이 아직 "(준비 중)"입니다. 출시 전에 채워야 합니다**

## 테스터 초대 가입 (`#/invite`)

일반 사용자는 Google로 로그인하고, **테스터는 초대 코드로 이메일 계정을 만들어** 쓸 수 있습니다. 메뉴에는 보이지 않는 화면입니다.

- https://recordish.github.io/#/invite → **초대 코드로 가입**(코드 + 이메일 + 비밀번호) / **이메일 로그인**
- 초대 코드: Firestore `invites/{코드}` = `{ maxUses, uses }`. 운영자가 Firebase 콘솔에서 직접 만듭니다
  - 가입할 때마다 `uses`가 1 늘고, `maxUses`에 닿으면 더 가입할 수 없습니다
  - 코드는 입력할 때 대문자로 바꿔서 찾습니다. **문서 ID는 대문자로** 만들어 주세요 (예: `RCD-7F3K-9Q2M`)
- 가입 기록: `members/{uid}` = `{ code, joinedAt }`. 가입과 동시에(같은 batch로) 코드 사용 횟수를 올릴 때만 만들 수 있습니다
- **쓰기 권한**(메모·사용량·프로필)은 **Google 계정 또는 초대 가입 기록이 있는 계정**만 가집니다 (`isMember()`)
  - 코드 없이 이메일 계정을 만들어도(코드를 보고 우회해도) 아무것도 쓸 수 없고, 앱도 자동으로 로그아웃시킵니다
  - 잘못된 코드로 가입하면 방금 만든 계정을 바로 지웁니다
- 계정 삭제 시 가입 기록(`members`)도 함께 지웁니다. 초대 코드의 사용 횟수는 되돌리지 않습니다

**Firebase 콘솔 설정**
1. Authentication → 로그인 방법 → **이메일/비밀번호** 사용 설정 (이메일 링크는 끔)
2. Firestore Database → 데이터 → **컬렉션 시작** `invites` → 문서 ID에 코드(대문자), 필드 `maxUses`(number), `uses`(number, 0)
3. `firestore.rules` 게시

## 앱 (PWA / 안드로이드)

- **PWA**: `public/manifest.webmanifest`(앱 이름·아이콘·색), `public/sw.js`(서비스 워커), `public/offline.html`(오프라인 안내)
  - 화면(HTML)은 항상 최신을 네트워크에서 받고, 인터넷이 끊기면 오프라인 안내를 보여줍니다
  - `/assets/*`(버전이 붙은 빌드 파일)만 기기에 저장해 다시 씁니다. Firebase 요청은 건드리지 않습니다
  - 서비스 워커는 배포 빌드에서만 등록됩니다 (`src/main.jsx`)
- **아이콘**: `public/icons/` (192·512 일반, 512 maskable, 180 iPhone)

### 안드로이드 앱 (`android/`)

구글 플레이용 **TWA(Trusted Web Activity)** 앱입니다. 앱이 https://recordish.github.io/ 를 크롬으로 전체 화면에 띄우므로,
**사이트를 배포하면 앱도 바로 최신**이 됩니다 (앱을 다시 올릴 필요 없음).

- 패키지 이름 `com.recordish.app`, 최소 Android 7.0(API 24), 대상 API 36
- 라이브러리: `com.google.androidbrowserhelper:androidbrowserhelper`
- 아이콘: 적응형 아이콘(파란 배경 + 흰 R), 스플래시: `res/drawable/splash.png`
- **앱 ↔ 사이트 연결**: `public/.well-known/assetlinks.json` 에 앱 서명 인증서 SHA-256 지문이 있어야 앱 위쪽 주소창이 사라집니다
  - 업로드 키 지문은 들어 있음. **구글 플레이 앱 서명 키 지문**(플레이 콘솔 → 설정 → 앱 무결성)을 추가해야 합니다
  - GitHub Pages 배포는 숨김 폴더(`.well-known`)를 올리기 위해 `actions/upload-pages-artifact@v3` 를 씁니다 (v4 는 숨김 파일을 뺌)

**빌드 (AAB)**
```bash
# 필요: JDK 17+, Android SDK (platforms;android-36, build-tools)
cd android
echo "sdk.dir=/path/to/android-sdk" > local.properties
# 서명 정보 (git에 올리지 않음)
cat > keystore.properties <<'EOT'
storeFile=/path/to/recordish-upload.keystore
storePassword=...
keyAlias=upload
keyPassword=...
EOT
./gradlew bundleRelease        # → app/build/outputs/bundle/release/app-release.aab
```
- 새 버전을 올릴 때는 `app/build.gradle` 의 `versionCode` 를 1 올립니다
- ⚠️ 서명 키(`*.keystore`)와 `keystore.properties` 는 **절대 커밋하지 말고 안전하게 백업**하세요 (`android/.gitignore`)

### 구글 플레이 등록 자료 (`store/`)

- `play-console-guide.md`: 스토어 설명, 데이터 보안·콘텐츠 등급 답변, 앱 액세스 안내, 테스트·출시 순서
- `play-store-icon-512.png`, `feature-graphic-1024x500.png`, `screenshots/` (1082×1922)

## 실행 방법

Node.js 20.19+ 또는 22.12+ 가 필요합니다.

```bash
npm install      # 의존성 설치 (처음 한 번)
npm run dev      # 개발 서버 실행 → http://localhost:5173
```

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (저장하면 화면이 바로 갱신됨) |
| `npm run build` | 배포용 빌드 → `dist/` |
| `npm run preview` | 빌드 결과를 로컬에서 미리보기 |
| `npm run lint` | 코드 검사 (oxlint) |

`npm run dev`는 기본적으로 **로컬 모드**(Firebase 없이 브라우저 `localStorage`에 저장, 로그인·글자 제한 없음)로 동작합니다.
개발 중에도 Firebase를 쓰는 방법은 아래 [로컬 개발에서 Firebase 쓰기](#로컬-개발에서-firebase-쓰기)를 참고하세요.

## 배포 (GitHub Pages)

`main` 브랜치에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 앱을 검사(`lint`)하고 빌드해서
**https://recordish.github.io/** 에 배포합니다. Actions 탭에서 **Deploy to GitHub Pages → Run workflow**로 직접 다시 실행할 수도 있습니다.

- 처음 한 번만: 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정
- 배포된 앱은 `.env.production`의 Firebase 설정값을 사용합니다

> ⚠️ `firestore.rules`나 `firestore.indexes.json`을 바꾸면 **Firebase 콘솔에도 반영해야** 합니다
> (GitHub 배포만으로는 Firebase 쪽 설정이 바뀌지 않습니다). 아래 [Firebase 설정](#firebase-설정)을 참고하세요.

## 폴더 구조

```
recordish.github.io/
├── .github/workflows/
│   └── deploy.yml              # GitHub Pages 자동 배포
├── index.html
├── vite.config.js
├── .env.production             # 배포용 Firebase 설정값 (공개 값)
├── .env.example                # Firebase 설정값 예시
├── firebase.json               # Firebase CLI/에뮬레이터 설정
├── firestore.rules             # Firestore 보안 규칙
├── firestore.indexes.json      # Firestore 색인 (공개 메모 최신순 정렬)
├── public/
│   ├── favicon.svg             # 탭 아이콘
│   ├── icons/                  # 앱 아이콘 (PNG)
│   ├── .well-known/assetlinks.json  # 안드로이드 앱 ↔ 사이트 연결
│   ├── manifest.webmanifest    # PWA 앱 정보
│   ├── sw.js                   # 서비스 워커
│   ├── offline.html            # 오프라인 안내 화면
│   └── privacy.html            # 개인정보처리방침
├── android/                    # 안드로이드 앱 (TWA, 구글 플레이용)
├── store/                      # 구글 플레이 등록 자료·이미지 (배포 안 됨)
└── src/
    ├── main.jsx                # 진입점
    ├── App.jsx                 # 라우팅 + AuthProvider
    ├── index.css               # 전역 스타일 (색상 변수: 포인트 컬러 연한 블루)
    ├── firebase/
    │   └── config.js           # Firebase 초기화 (auth, db 내보냄)
    ├── services/               # 데이터/인증 접근 계층
    │   ├── memoService.js      #   메모 CRUD, 공개 메모 페이지, 하루 글자 사용량
    │   ├── profileService.js   #   이름, 접속 횟수·시각 (profiles/{uid})
    │   └── authService.js      #   Google 로그인, 초대 코드 가입·이메일 로그인, 로그아웃, 계정 삭제
    ├── contexts/
    │   └── AuthContext.jsx     # 로그인 사용자 전역 상태
    ├── hooks/
    │   ├── useMemos.js         # useFeed(로고/나만보기/공개메모 목록 + 더 보기 + 작성·수정·삭제)
    │   └── useNow.js           # "3분 전" 표시 갱신용 현재 시각
    ├── utils/
    │   ├── defaultName.js      # 기본 이름 (Running Wolf 같은 영어 이름)
    │   ├── relativeTime.js     # "방금 전 / 3분 전 / 2일 전" 변환
    │   └── text.js             # 글자 수 세기, 하루 글자 한도(10,000)
    ├── components/             # 재사용 UI 컴포넌트
    │   ├── Header.jsx          #   로고(→ 모두의 공개 메모), 나만보기/공개메모 탭, 사람 아이콘(→ 마이페이지)
    │   ├── MemoEditor.jsx      #   메모 입력창 + 글자 수 + 공개/비공개 선택
    │   ├── MemoContent.jsx     #   메모 본문 (3줄 말줄임 + 더보기/접기)
    │   ├── MemoItem.jsx
    │   ├── MemoList.jsx
    │   ├── MoreMenu.jsx           # 점 세 개(⋮) 메뉴 (수정/삭제)
    │   ├── VisibilityToggle.jsx   # 🔒 비공개 / 🌐 공개 버튼
    │   ├── GoogleSignInButton.jsx # Google 스타일 로그인 버튼
    │   └── ProtectedRoute.jsx     # 로그인 필요 화면 (비로그인은 로그인 화면으로)
    └── pages/                  # 라우트 단위 화면
        ├── FeedPage.jsx        #   로고(#/) · 나만보기(#/mine) · 공개메모(#/public)
        ├── AccountPage.jsx     #   마이페이지: 내 정보, 이름, 이용 기록, 로그아웃, 계정 삭제 (#/account)
        ├── InvitePage.jsx      #   테스터 초대 가입 · 이메일 로그인 (#/invite, 메뉴에 없음)
        ├── LoginPage.jsx       #   로그인 (#/login)
        └── NotFoundPage.jsx
```

데이터 흐름: `pages` → `hooks` → `services` → (Firestore | localStorage).

## 데이터 구조 (Firestore)

| 경로 | 내용 |
| --- | --- |
| `memos/{memoId}` | `{ uid, authorName, content, isPublic, createdAt, updatedAt }` |
| `usage/{uid}` | `{ day: 20261102, chars: 1234 }` — 오늘(한국 시간) 쓴 글자 수 |
| `invites/{코드}` | `{ maxUses, uses }` — 테스터 초대 코드 (운영자가 콘솔에서 만듦) |
| `members/{uid}` | `{ code, joinedAt }` — 초대 코드로 가입한 기록 |
| `profiles/{uid}` | `{ name, visitCount, lastVisitAt, prevVisitAt }` — 이름(null이면 기본값), 접속 횟수, 이번·이전 접속 시각 |

- **나만보기 / 공개메모**: `uid == 내 uid` && `isPublic == false / true`로 전부 불러와 브라우저에서 최신순으로 정렬합니다 (`getMyMemos`)
- **정렬**: 모든 목록은 **작성 시각(`createdAt`) 최신순**입니다. 수정해도 순서가 바뀌지 않고, 시간도 작성 시각으로 보여줍니다(수정한 메모에는 "· 수정됨")
- **공개 메모**: `isPublic == true`, `createdAt` 내림차순, 21개씩 읽어서 20개를 보여주고 다음 페이지가 있는지 판단합니다
  → 복합 색인(`isPublic` 오름차순 + `createdAt` 내림차순)이 필요합니다 (`firestore.indexes.json`)
- **로고 화면**: 모두의 공개 메모를 위 방식으로 20개씩 불러옵니다 (`useFeed`, `src/hooks/useMemos.js`)
- **메모 작성·수정**: 메모와 `usage/{uid}`를 한 번에(batch) 저장합니다. 보안 규칙이 사용량이 정확히 늘었는지 확인합니다

### 보안 규칙 요약 (`firestore.rules`)

- 공개 메모는 누구나 읽을 수 있고, 비공개 메모는 작성자만 읽을 수 있습니다
- 작성, 수정, 삭제는 작성자만 할 수 있고, 작성자(`uid`)는 바꿀 수 없습니다. 필드 타입도 검사합니다
- 하루 글자 사용량(`usage/{uid}`)
  - 본인만 읽고 쓰고 지울 수 있고(지우기는 회원 탈퇴용), 오늘 날짜로만 기록할 수 있습니다
  - 10,000자를 넘을 수 없고, 같은 날 안에서는 줄일 수 없습니다
  - 메모를 쓰거나 늘릴 때는 같은 batch에서 사용량이 정확히 그만큼 늘어나야 합니다
- 프로필(`profiles/{uid}`)은 본인만 읽고 쓰고 지울 수 있습니다. 정해진 필드만 허용하고, 이름은 null 또는 1~20자 문자열, 메모의 작성자 이름도 20자 이하만 허용합니다
- 예전 저장 위치(`users/{uid}/memos`)는 본인 읽기/삭제만 허용합니다

## Firebase 설정

Firebase 프로젝트: `recordish`. 설정값은 `.env.production`에 있습니다.

> 이 값들(apiKey 등)은 브라우저에 그대로 공개되는 값이라 커밋해도 됩니다. 실제 보안은 보안 규칙이 담당합니다.

### 처음 만들 때 (이미 완료)
1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 만들기 → **웹(`</>`) 앱 추가** → `firebaseConfig` 값을 `.env.production`에 넣기
2. **Authentication → 로그인 방법 → Google** 사용 설정
3. **Authentication → 설정 → 승인된 도메인**에 `recordish.github.io` 추가
4. **Firestore Database → 데이터베이스 만들기** (프로덕션 모드, 위치 `asia-northeast3` 서울)

### 보안 규칙 반영
`firestore.rules`를 바꿨다면 **Firebase 콘솔 → Firestore Database → 규칙** 탭에 전체 내용을 붙여넣고 **게시**합니다.

### 색인 만들기
공개 메모를 최신순으로 20개씩 불러오려면 복합 색인이 필요합니다. 아래 링크를 열고 **색인 만들기**를 누르면 됩니다 (만드는 데 몇 분 걸림).

https://console.firebase.google.com/v1/r/project/recordish/firestore/indexes?create_composite=Ckdwcm9qZWN0cy9yZWNvcmRpc2gvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL21lbW9zL2luZGV4ZXMvXxABGgwKCGlzUHVibGljEAEaDQoJdXBkYXRlZEF0EAIaDAoIX19uYW1lX18QAg

또는 Firebase CLI로 `npx firebase-tools deploy --only firestore:indexes --project recordish`

### 로컬 개발에서 Firebase 쓰기
```bash
cp .env.production .env.local   # .env.local 은 git에 올라가지 않음
npm run dev
```

**에뮬레이터로 테스트하기** (실제 데이터를 건드리지 않음): `.env.local`에 `VITE_USE_FIREBASE_EMULATOR=true`를 넣고 아래를 함께 실행합니다.
```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-memo
```
에뮬레이터는 `firestore.rules`와 `firestore.indexes.json`을 그대로 읽어서 실제와 같은 규칙으로 동작합니다.
