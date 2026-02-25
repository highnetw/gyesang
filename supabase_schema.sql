-- ============================================================
-- 계상회 Supabase Schema
-- Supabase SQL Editor에 복붙하여 실행하세요
-- ============================================================

-- 1. 회원 테이블
CREATE TABLE members (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  grade       INTEGER NOT NULL,          -- 졸업 기수 (예: 72)
  mobile      TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  company     TEXT DEFAULT '',
  department  TEXT DEFAULT '',
  position    TEXT DEFAULT '',
  address     TEXT DEFAULT '',
  prev_company TEXT DEFAULT '',          -- 전 직장
  memo        TEXT DEFAULT '',
  bio         TEXT DEFAULT '',           -- 자기소개
  photo_url   TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 모임 테이블
CREATE TABLE meetings (
  id           BIGSERIAL PRIMARY KEY,
  meeting_date DATE NOT NULL,
  place        TEXT NOT NULL,
  is_upcoming  BOOLEAN DEFAULT FALSE,
  food_rating  INTEGER DEFAULT 0 CHECK (food_rating BETWEEN 0 AND 5),
  food_comment TEXT DEFAULT '',
  comment      TEXT DEFAULT '',          -- 모임 소감
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 모임 참석자 (완료된 모임)
CREATE TABLE meeting_attendees (
  id         BIGSERIAL PRIMARY KEY,
  meeting_id BIGINT REFERENCES meetings(id) ON DELETE CASCADE,
  member_id  BIGINT REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE(meeting_id, member_id)
);

-- 4. 모임 참석 예정자 (예정 모임)
CREATE TABLE meeting_expected (
  id         BIGSERIAL PRIMARY KEY,
  meeting_id BIGINT REFERENCES meetings(id) ON DELETE CASCADE,
  member_id  BIGINT REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, member_id)
);

-- 5. 모임 사진
CREATE TABLE meeting_photos (
  id         BIGSERIAL PRIMARY KEY,
  meeting_id BIGINT REFERENCES meetings(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 공지사항
CREATE TABLE notices (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  author     TEXT DEFAULT '관리자',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) - 전체 읽기 허용, 쓰기도 허용
-- (앱 자체에서 비번으로 제어하므로 DB는 열어둠)
-- ============================================================
ALTER TABLE members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_expected  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_photos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices         ENABLE ROW LEVEL SECURITY;

-- 모든 테이블 anon 읽기/쓰기 허용
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['members','meetings','meeting_attendees','meeting_expected','meeting_photos','notices']
  LOOP
    EXECUTE format('CREATE POLICY "allow_all_%s" ON %s FOR ALL TO anon USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_members_updated   BEFORE UPDATE ON members   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_meetings_updated  BEFORE UPDATE ON meetings  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notices_updated   BEFORE UPDATE ON notices   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Storage bucket for photos (run separately if needed)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-photos', 'meeting-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos',  'member-photos',  true);
