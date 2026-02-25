# 계상회 앱

중앙고 · 상대 동문 모임 관리 앱  
**Next.js 14 + Supabase + Vercel**

---

## 📋 설치 & 배포 순서

### 1단계 — Supabase DB 테이블 생성

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 → 좌측 메뉴 **SQL Editor** 클릭
3. `supabase_schema.sql` 파일 내용 전체 복붙 → **Run** 클릭
4. 테이블 6개가 생성됩니다:
   - `members` — 회원 정보
   - `meetings` — 모임 기록
   - `meeting_attendees` — 모임 참석자
   - `meeting_expected` — 참석 예정자
   - `meeting_photos` — 모임 사진
   - `notices` — 공지사항

---

### 2단계 — CSV 회원 데이터 Import

1. 엑셀 파일을 CSV로 저장 (UTF-8 인코딩)
2. CSV 컬럼 순서 확인:  
   `이름, 기수, 휴대폰, 이메일, 회사, 부서, 직급, 집주소`
3. Supabase Dashboard → **Table Editor** → `members` 테이블 선택
4. 우상단 **Import** 버튼 → CSV 파일 업로드
5. 컬럼 매핑:

| CSV 컬럼 | DB 컬럼 |
|---------|---------|
| 이름 | name |
| 기수 | grade |
| 휴대폰 | mobile |
| 이메일 | email |
| 회사 | company |
| 부서 | department |
| 직급 | position |
| 집주소 | address |

---

### 3단계 — GitHub에 코드 올리기

```bash
# 이 폴더에서 실행
git init
git add .
git commit -m "계상회 앱 초기 커밋"

# GitHub에서 새 repo 만들고
git remote add origin https://github.com/YOUR_USERNAME/gyesanghoe.git
git push -u origin main
```

---

### 4단계 — Vercel 배포

1. [vercel.com](https://vercel.com) 접속 → **New Project**
2. GitHub repo 선택 → **Import**
3. **Environment Variables** 설정 (중요!):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zhchuypwwhgqzofrknsq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (anon key 전체) |
| `ENTRY_PIN` | `1234` |
| `MEMBER_PIN` | `5678` |
| `ADMIN_PIN` | `9999` |

4. **Deploy** 클릭 → 2~3분 후 완료
5. `https://gyesanghoe.vercel.app` 형태의 URL로 접속 가능

---

## 🔐 비밀번호 구조

| 구분 | 번호 | 용도 |
|------|------|------|
| 진입 비번 | `1234` | 앱 입장 (외부인 차단) |
| 회원 비번 | `5678` | 참석 예정 체크, 본인 정보 수정 |
| 관리자 비번 | `9999` | 회원 추가/삭제, 모임 등록, 공지 작성, 엑셀 출력, 백업 |

> ⚠️ 실제 운영 시 Vercel 환경변수에서 비번 변경 권장

---

## 📁 프로젝트 구조

```
gyesanghoe/
├── app/
│   ├── api/
│   │   ├── verify-pin/route.ts   # 비번 검증 (서버)
│   │   └── export-members/route.ts # 엑셀 출력
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AppClient.tsx    # 메인 앱 (전체 UI)
│   ├── BottomNav.tsx
│   ├── PinModal.tsx
│   └── StarRating.tsx
├── lib/
│   ├── supabase.ts
│   └── types.ts
├── supabase_schema.sql  # DB 생성 SQL
├── .env.local           # 로컬 개발용 (gitignore됨)
└── .env.example         # Vercel 설정 참고용
```

---

## 🛠 로컬 개발 실행

```bash
npm install
npm run dev
# http://localhost:3000
```
