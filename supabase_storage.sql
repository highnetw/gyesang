-- ============================================================
-- 계상회 Storage 버킷 설정
-- Supabase SQL Editor에서 실행하세요 (schema 실행 후)
-- ============================================================

-- 회원 사진 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos',
  'member-photos',
  true,                          -- public: 누구나 URL로 조회 가능
  5242880,                       -- 5MB 제한
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 모임 사진 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-photos',
  'meeting-photos',
  true,
  10485760,                      -- 10MB 제한
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책: anon 읽기/쓰기 허용
-- (앱 자체 비번으로 접근 제어하므로 DB 레벨은 열어둠)

CREATE POLICY "member-photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'member-photos');

CREATE POLICY "member-photos anon upload"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'member-photos');

CREATE POLICY "member-photos anon update"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'member-photos');

CREATE POLICY "member-photos anon delete"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'member-photos');

CREATE POLICY "meeting-photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meeting-photos');

CREATE POLICY "meeting-photos anon upload"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'meeting-photos');

CREATE POLICY "meeting-photos anon delete"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'meeting-photos');
