'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Member, Meeting, Notice } from '@/lib/types'
import PinModal from '@/components/PinModal'
import BottomNav from '@/components/BottomNav'
import StarRating from '@/components/StarRating'
import ImageUpload from '@/components/ImageUpload'

// ── 스타일 헬퍼 ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid #A5003433',
  borderRadius: 12, padding: 16, marginBottom: 10,
}
const header: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(26,0,16,0.97) 0%, rgba(13,0,8,0.95) 100%)',
  padding: '18px 20px 14px', borderBottom: '1px solid var(--gold-dim)',
  position: 'sticky', top: 0, zIndex: 100,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg)', border: '1px solid var(--crimson-dim)',
  borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none',
}
const btn = (v: 'gold' | 'outline' | 'red' = 'gold'): React.CSSProperties => ({
  padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-sans)',
  ...(v === 'gold' ? { background: 'var(--crimson)', color: 'var(--bg)' } :
    v === 'red' ? { background: '#c0392b22', color: 'var(--danger)', border: '1px solid #c0392b44' } :
      { background: 'transparent', color: 'var(--crimson)', border: '1px solid var(--crimson-dim)' }),
})
const label: React.CSSProperties = {
  fontSize: 11, color: 'var(--gold)', letterSpacing: 1,
  marginBottom: 4, display: 'block', textTransform: 'uppercase',
}
const fieldWrap: React.CSSProperties = { marginBottom: 14 }

// ── 스플래시 ─────────────────────────────────────────────────────────────────
function Splash({ onDone }: { onDone: () => void }) {
  const [fade, setFade] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1800)
    const t2 = setTimeout(onDone, 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, #0d0008 0%, #1a0010 50%, #200015 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fade ? 0 : 1, transition: 'opacity 0.6s ease', zIndex: 9999,
    }}>
      <div style={{
        width: 160, height: 160, borderRadius: '50%',
        border: '3px solid var(--crimson)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle, #3a0020 0%, #0d0008 100%)',
        animation: 'pulse 2s infinite', marginBottom: 28,
        overflow: 'hidden', padding: 16,
        boxSizing: 'border-box',
      }}>
        <img
          src="/mark-choongang.png"
          alt="중앙고 마크"
          style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(1.1)' }}
        />
      </div>
      <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: 6, fontFamily: 'var(--font-serif)' }}>계상회</div>
      <div style={{ fontSize: 13, color: 'var(--gold)', letterSpacing: 4, marginTop: 8, opacity: 0.8 }}>중앙고 · 상대 동문</div>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function AppClient() {
  const [phase, setPhase] = useState<'splash' | 'pin' | 'app'>('splash')
  const [page, setPage] = useState('home')
  const [isAdmin, setIsAdmin] = useState(false)
  const [pinModal, setPinModal] = useState<{ type: any; title: string; onSuccess: () => void } | null>(null)

  // data
  const [members, setMembers] = useState<Member[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(false)

  // detail views
  const [selMember, setSelMember] = useState<Member | null>(null)
  const [selMeeting, setSelMeeting] = useState<Meeting | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  // search / filter
  const [searchQ, setSearchQ] = useState('')
  const [filterGrade, setFilterGrade] = useState<string>('all')

  // edit forms
  const [editMember, setEditMember] = useState<Partial<Member> | null>(null)
  const [editMeeting, setEditMeeting] = useState<Partial<Meeting> | null>(null)
  const [editNotice, setEditNotice] = useState<Partial<Notice> | null>(null)

  // ── 데이터 로드 ────────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('members').select('*').order('grade').order('name')
    if (data) setMembers(data)
  }, [])

  const loadMeetings = useCallback(async () => {
    const { data: mtgs } = await supabase.from('meetings').select('*').order('meeting_date', { ascending: false })
    if (!mtgs) return

    // 참석자 로드
    const enriched = await Promise.all(mtgs.map(async (mt) => {
      const [{ data: att }, { data: exp }, { data: ph }] = await Promise.all([
        supabase.from('meeting_attendees').select('member_id, members(*)').eq('meeting_id', mt.id),
        supabase.from('meeting_expected').select('member_id, members(*)').eq('meeting_id', mt.id),
        supabase.from('meeting_photos').select('*').eq('meeting_id', mt.id),
      ])
      return {
        ...mt,
        attendees: (att || []).map((r: any) => r.members).filter(Boolean),
        expected: (exp || []).map((r: any) => r.members).filter(Boolean),
        photos: ph || [],
      }
    }))
    setMeetings(enriched)
  }, [])

  const loadNotices = useCallback(async () => {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false })
    if (data) setNotices(data)
  }, [])

  useEffect(() => {
    if (phase === 'app') {
      setLoading(true)
      Promise.all([loadMembers(), loadMeetings(), loadNotices()]).finally(() => setLoading(false))
    }
  }, [phase, loadMembers, loadMeetings, loadNotices])

  // ── 핀 모달 헬퍼 ───────────────────────────────────────────────────────
  const requirePin = (type: any, title: string, onSuccess: () => void) => {
    setPinModal({ type, title, onSuccess: () => { setPinModal(null); onSuccess() } })
  }

  // ── 네비 ───────────────────────────────────────────────────────────────
  const nav = (p: string) => { setPage(p); setSelMember(null); setSelMeeting(null) }

  const grades = [...new Set(members.map(m => m.grade))].sort((a, b) => a - b)
  const upcomingMeeting = meetings.find(m => m.is_upcoming)

  const filteredMembers = members.filter(m => {
    const q = searchQ.toLowerCase()
    const matchQ = !q || m.name.includes(q) || String(m.grade).includes(q) || m.company.includes(q)
    const matchG = filterGrade === 'all' || m.grade === Number(filterGrade)
    return matchQ && matchG
  })

  // ── 엑셀 출력 ──────────────────────────────────────────────────────────
  const doExport = () => {
    window.location.href = '/api/export-members'
  }

  // ── 백업 ───────────────────────────────────────────────────────────────
  const doBackup = () => {
    const data = JSON.stringify({ members, meetings, notices }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `계상회_백업_${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── 홈 페이지 ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const HomePage = () => (
    <div style={{ paddingBottom: 100 }}>
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-serif)', letterSpacing: 3 }}>계상회</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin
              ? <span style={{ fontSize: 12, color: 'var(--gold)', padding: '5px 12px', border: '1px solid var(--crimson-dim)', borderRadius: 8 }}>👑 관리자</span>
              : <button onClick={() => setIsAdmin(true)} style={{ ...btn('outline'), fontSize: 12 }}>관리자 로그인</button>
            }
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* 다음 모임 배너 */}
        {upcomingMeeting && (
          <div className="fade-in" style={{
            background: 'linear-gradient(135deg, #2a0018, #1a0010)',
            border: '1px solid #A5003466', borderRadius: 16, padding: 20, marginBottom: 20, cursor: 'pointer',
          }} onClick={() => { setSelMeeting(upcomingMeeting); setPage('meetingDetail') }}>
            <div style={{ fontSize: 11, color: 'var(--success)', letterSpacing: 2, marginBottom: 6 }}>📅 다음 모임 예정</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{upcomingMeeting.place}</div>
            <div style={{ color: 'var(--gold)', marginTop: 4 }}>{upcomingMeeting.meeting_date}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>
              참석 예정: {(upcomingMeeting.expected || []).length}명
            </div>
          </div>
        )}

        {/* 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: '전체 회원', value: `${members.length}명`, icon: '👥', page: 'members' },
            { label: '기수', value: `${grades.length}기수`, icon: '🎓', page: 'org' },
            { label: '모임 횟수', value: `${meetings.filter(m => !m.is_upcoming).length}회`, icon: '🍽', page: 'meetings' },
            { label: '공지사항', value: `${notices.length}건`, icon: '📢', page: 'notices' },
          ].map(({ label: l, value, icon, page: p }) => (
            <div key={l} onClick={() => nav(p)} style={{ ...card, textAlign: 'center', marginBottom: 0, cursor: 'pointer' }}>
              <div style={{ fontSize: 26 }}>{icon}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--crimson)' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* 최근 공지 */}
        {notices.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: 1, marginBottom: 10 }}>📢 최근 공지</div>
            {notices.slice(0, 2).map(n => (
              <div key={n.id} onClick={() => nav('notices')} style={{ cursor: 'pointer', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #c9a84c11' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{n.created_at?.slice(0, 10)}</div>
              </div>
            ))}
          </div>
        )}

        {/* 관리자 툴 */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={doExport} style={{ ...btn('outline'), flex: 1 }}>📊 엑셀 출력</button>
            <button onClick={doBackup} style={{ ...btn('outline'), flex: 1 }}>💾 백업</button>
          </div>
        )}
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════
  // ── 회원 목록 ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const MembersPage = () => (
    <div style={{ paddingBottom: 100 }}>
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-serif)' }}>회원 명부</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={doExport} style={{ ...btn('outline'), fontSize: 12 }}>엑셀</button>
            {isAdmin && (
              <button onClick={() => setEditMember({ name: '', grade: grades[0] || 72, mobile: '', email: '', company: '', department: '', position: '', address: '', prev_company: '', memo: '', bio: '', photo_url: '' })}
                style={{ ...btn(), fontSize: 12 }}>+ 추가</button>
            )}
          </div>
        </div>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="이름 · 기수 · 회사 검색" style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {['all', ...grades.map(String)].map(g => (
            <button key={g} onClick={() => setFilterGrade(g)}
              style={{ ...btn(filterGrade === g ? 'gold' : 'outline'), padding: '4px 12px', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {g === 'all' ? '전체' : `${g}기`}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '16px 20px 0' }}>
        {(filterGrade === 'all' ? grades : [Number(filterGrade)]).map(grade => {
          const gm = filteredMembers.filter(m => m.grade === grade)
          if (!gm.length) return null
          return (
            <div key={grade} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: 2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{grade}기</span>
                <span style={{ background: 'var(--crimson-bg)', borderRadius: 10, padding: '1px 8px' }}>{gm.length}명</span>
              </div>
              {gm.map(m => (
                <div key={m.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                  onClick={() => { setSelMember(m); setPage('memberDetail') }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--crimson-bg)', border: '2px solid var(--crimson-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, color: 'var(--gold)', flexShrink: 0, overflow: 'hidden',
                  }}>
                    {m.photo_url
                      ? <img src={m.photo_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : m.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[m.company, m.position].filter(Boolean).join(' · ') || m.mobile}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, color: '#555' }}>›</div>
                </div>
              ))}
            </div>
          )
        })}
        {filteredMembers.length === 0 && <div style={{ textAlign: 'center', color: '#555', padding: 40 }}>검색 결과가 없습니다</div>}
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════
  // ── 회원 상세 ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const MemberDetailPage = () => {
    const m = selMember
    if (!m) return null

    const doEdit = () => setEditMember({ ...m })
    const doAdminEdit = () => setEditMember({ ...m })
    const doDelete = async () => {
      if (!confirm('정말 삭제하시겠습니까?')) return
      await supabase.from('members').delete().eq('id', m.id)
      await loadMembers()
      nav('members')
    }

    return (
      <div style={{ paddingBottom: 100 }}>
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => nav('members')} style={{ ...btn('outline'), padding: '6px 12px' }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-serif)' }}>{m.name}</div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
              background: 'var(--gold-bg)', border: '3px solid var(--crimson)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, fontWeight: 700, color: 'var(--gold)', overflow: 'hidden',
            }}>
              {m.photo_url
                ? <img src={m.photo_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : m.name[0]}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 10 }}>{m.name}</div>
            <div style={{ fontSize: 14, color: 'var(--gold)' }}>{m.grade}기</div>
          </div>

          {[
            { label: '휴대폰', value: m.mobile, href: `tel:${m.mobile}` },
            { label: '이메일', value: m.email, href: `mailto:${m.email}` },
            { label: '회사', value: m.company },
            { label: '부서/직급', value: [m.department, m.position].filter(Boolean).join(' / ') },
            { label: '주소', value: m.address },
            { label: '전 직장', value: m.prev_company },
            { label: '메모', value: m.memo },
          ].filter(f => f.value).map(({ label: l, value, href }) => (
            <div key={l} style={{ ...card, display: 'flex', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--gold)', width: 72, flexShrink: 0, paddingTop: 1 }}>{l}</div>
              {href
                ? <a href={href} style={{ color: 'var(--text)', fontSize: 14 }}>{value}</a>
                : <div style={{ fontSize: 14 }}>{value}</div>}
            </div>
          ))}
          {m.bio && (
            <div style={card}>
              <div style={{ ...label, marginBottom: 8 }}>자기소개</div>
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>{m.bio}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={doEdit} style={{ ...btn(), flex: 1 }}>✏️ 수정</button>
            {isAdmin && <button onClick={doDelete} style={{ ...btn('red'), flex: 1 }}>🗑 삭제</button>}
          </div>
          {isAdmin && (
            <button onClick={doAdminEdit} style={{ ...btn('outline'), width: '100%', marginTop: 8 }}>관리자 수정</button>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── 회원 편집 모달 ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const MemberEditModal = () => {
    const [form, setForm] = useState<Partial<Member>>({ ...editMember })
    const [saving, setSaving] = useState(false)
    const set = (k: keyof Member, v: any) => setForm(prev => ({ ...prev, [k]: v }))

    const save = async () => {
      if (!form.name) return
      setSaving(true)
      try {
        if (form.id) {
          const { data } = await supabase.from('members').update(form).eq('id', form.id).select().single()
          if (data) { setSelMember(data); await loadMembers() }
        } else {
          await supabase.from('members').insert(form)
          await loadMembers()
        }
        setEditMember(null)
      } finally { setSaving(false) }
    }

    const FIELDS: { k: keyof Member; label: string; type?: string }[] = [
      { k: 'name', label: '이름 *' },
      { k: 'grade', label: '기수', type: 'number' },
      { k: 'mobile', label: '휴대폰' },
      { k: 'email', label: '이메일', type: 'email' },
      { k: 'company', label: '회사' },
      { k: 'department', label: '부서' },
      { k: 'position', label: '직급' },
      { k: 'address', label: '주소' },
      { k: 'prev_company', label: '전 직장' },
      { k: 'memo', label: '메모' },
    ]

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 500, overflowY: 'auto' }}>
        <div style={{ background: 'var(--surface)', minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>{form.id ? '회원 수정' : '회원 추가'}</div>
            <button onClick={() => setEditMember(null)} style={{ ...btn('outline'), padding: '6px 12px' }}>취소</button>
          </div>

          {FIELDS.map(({ k, label: l, type }) => (
            <div key={k} style={fieldWrap}>
              <label style={label}>{l}</label>
              <input type={type || 'text'} value={String(form[k] ?? '')}
                onChange={e => set(k, type === 'number' ? Number(e.target.value) : e.target.value)}
                style={inputStyle} />
            </div>
          ))}
          <div style={fieldWrap}>
            <label style={label}>자기소개</label>
            <textarea value={form.bio ?? ''} onChange={e => set('bio', e.target.value)}
              rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={fieldWrap}>
            <label style={label}>프로필 사진</label>
            <ImageUpload
              bucket="member-photos"
              currentUrl={form.photo_url}
              onUpload={url => set('photo_url', url)}
              shape="circle"
              placeholder="사진 업로드"
            />
          </div>

          <button onClick={save} disabled={saving} style={{ ...btn(), width: '100%', padding: 14, fontSize: 16, opacity: saving ? 0.7 : 1 }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── 조직도 ────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const OrgPage = () => (
    <div style={{ paddingBottom: 100 }}>
      <div style={header}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-serif)' }}>조직도</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>← 가로로 스크롤 →</div>
      </div>
      <div style={{ overflowX: 'auto', padding: 20 }}>
        <table style={{ borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 16px', background: 'var(--surface)', color: 'var(--gold)', fontSize: 12, letterSpacing: 1, borderRight: '1px solid var(--crimson-dim)', position: 'sticky', left: 0 }}>기수</th>
              {Array.from({ length: Math.max(0, ...grades.map(g => members.filter(m => m.grade === g).length)) }).map((_, i) => (
                <th key={i} style={{ padding: '8px 10px', color: '#444', fontSize: 11 }}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grades.map(grade => {
              const gm = members.filter(m => m.grade === grade)
              return (
                <tr key={grade} style={{ borderTop: '1px solid var(--gold-dim)' }}>
                  <td style={{ padding: '10px 16px', background: 'var(--surface)', color: 'var(--gold)', fontWeight: 700, borderRight: '1px solid var(--gold-dim)', position: 'sticky', left: 0, fontSize: 14 }}>
                    {grade}기
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 400 }}>{gm.length}명</div>
                  </td>
                  {gm.map(m => (
                    <td key={m.id} style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ cursor: 'pointer' }} onClick={() => { setSelMember(m); setPage('memberDetail') }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: 'var(--crimson-bg)', border: '2px solid var(--crimson-dim)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 700, color: 'var(--gold)',
                          margin: '0 auto 4px', overflow: 'hidden',
                        }}>
                          {m.photo_url
                            ? <img src={m.photo_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : m.name[0]}
                        </div>
                        <div style={{ fontSize: 11 }}>{m.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{m.position}</div>
                      </div>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════
  // ── 모임 목록 ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const MeetingsPage = () => (
    <div style={{ paddingBottom: 100 }}>
      <div style={header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-serif)' }}>모임 기록</div>
          {isAdmin && (
            <button onClick={() => setEditMeeting({ meeting_date: '', place: '', is_upcoming: false, food_rating: 0, food_comment: '', comment: '' })}
              style={{ ...btn(), fontSize: 12 }}>+ 모임 추가</button>
          )}
        </div>
      </div>
      <div style={{ padding: '16px 20px 0' }}>
        {meetings.map(mt => (
          <div key={mt.id} style={{ ...card, cursor: 'pointer' }} onClick={() => { setSelMeeting(mt); setPage('meetingDetail') }}>
            {mt.is_upcoming && <div style={{ fontSize: 11, color: 'var(--success)', letterSpacing: 2, marginBottom: 6 }}>📅 예정</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{mt.place}</div>
                <div style={{ fontSize: 13, color: 'var(--gold)', marginTop: 2 }}>{mt.meeting_date}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
                  {mt.is_upcoming
                    ? `참석 예정: ${(mt.expected || []).length}명`
                    : `참석: ${(mt.attendees || []).length}명`}
                </div>
              </div>
              {!mt.is_upcoming && mt.food_rating > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--gold)', fontSize: 14 }}>
                    {'★'.repeat(mt.food_rating)}{'☆'.repeat(5 - mt.food_rating)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>음식 평점</div>
                </div>
              )}
            </div>
          </div>
        ))}
        {meetings.length === 0 && <div style={{ textAlign: 'center', color: '#555', padding: 40 }}>모임 기록이 없습니다</div>}
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════
  // ── 모임 상세 ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const MeetingDetailPage = () => {
    const mt = selMeeting
    if (!mt) return null
    const [myMemberId, setMyMemberId] = useState<number | null>(null)

    const toggleExpected = async (memberId: number) => {
      const isIn = (mt.expected || []).some(m => m.id === memberId)
      if (isIn) {
        await supabase.from('meeting_expected').delete()
          .eq('meeting_id', mt.id).eq('member_id', memberId)
      } else {
        await supabase.from('meeting_expected').insert({ meeting_id: mt.id, member_id: memberId })
      }
      await loadMeetings()
      const updated = meetings.find(m => m.id === mt.id)
      if (updated) setSelMeeting(updated)
    }

    const handleCheckIn = () => {
      requirePin('member', '회원 비밀번호', () => {
        // 실제 앱에서는 회원 본인 확인 후 처리
        // 여기서는 선택 UI 제공
        setMyMemberId(-1) // trigger member select UI
      })
    }

    return (
      <div style={{ paddingBottom: 100 }}>
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => nav('meetings')} style={{ ...btn('outline'), padding: '6px 12px' }}>←</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-serif)' }}>{mt.place}</div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          {/* 예정 모임 참석 체크 */}
          {mt.is_upcoming && (
            <div style={{ ...card, background: 'linear-gradient(135deg,#1a2a1a,#1a1a2e)', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--success)', letterSpacing: 2, marginBottom: 12 }}>📅 예정된 모임</div>
              {myMemberId === -1 ? (
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>본인 이름을 선택하세요</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {members.map(m => {
                      const isIn = (mt.expected || []).some(e => e.id === m.id)
                      return (
                        <button key={m.id} onClick={() => { toggleExpected(m.id); setMyMemberId(null) }}
                          style={{ ...btn(isIn ? 'red' : 'gold'), padding: '5px 12px', fontSize: 13 }}>
                          {isIn ? `✅ ${m.name}` : m.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <button onClick={handleCheckIn} style={{ ...btn(), width: '100%', padding: 12 }}>
                  🙋 참석 예정 등록 / 취소
                </button>
              )}
            </div>
          )}

          <div style={card}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div><div style={label}>날짜</div><div style={{ fontSize: 14 }}>{mt.meeting_date}</div></div>
              <div><div style={label}>장소</div><div style={{ fontSize: 14 }}>{mt.place}</div></div>
            </div>
          </div>

          {!mt.is_upcoming && mt.food_rating > 0 && (
            <div style={card}>
              <div style={label}>음식 평점</div>
              <StarRating value={mt.food_rating} readonly />
              {mt.food_comment && <div style={{ fontSize: 13, marginTop: 8 }}>{mt.food_comment}</div>}
            </div>
          )}

          {!mt.is_upcoming && mt.comment && (
            <div style={card}>
              <div style={label}>모임 소감</div>
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>{mt.comment}</div>
            </div>
          )}

          <div style={card}>
            <div style={{ ...label, marginBottom: 10 }}>
              {mt.is_upcoming ? '참석 예정자' : '참석자'} {(mt.is_upcoming ? mt.expected : mt.attendees)?.length || 0}명
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(mt.is_upcoming ? mt.expected : mt.attendees)?.map(m => (
                <span key={m.id} style={{
                  background: 'var(--crimson-bg)', border: '1px solid var(--crimson-dim)',
                  borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#fff',
                }}>{m.name}</span>
              ))}
              {!(mt.is_upcoming ? mt.expected : mt.attendees)?.length && (
                <span style={{ color: '#555', fontSize: 13 }}>아직 없음</span>
              )}
            </div>
          </div>

          {/* 사진 */}
          {(mt.photos?.length || 0) > 0 && (
            <div style={card}>
              <div style={label}>모임 사진</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
                {mt.photos?.map(p => (
                  <img key={p.id} src={p.url} alt="모임 사진"
                    // 아래 한 줄 주석 처리하고 다음 줄을 내가 삽입함. 그림 화면 확대

                    //      onClick={() => setLightbox(p.url)}
                    onClick={() => window.open(p.url, '_blank')}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <button onClick={() => setEditMeeting({ ...mt })} style={{ ...btn(), width: '100%', padding: 12, marginTop: 8 }}>
              ✏️ 모임 수정
            </button>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── 모임 편집 모달 ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const MeetingEditModal = () => {
    const [form, setForm] = useState<Partial<Meeting>>({ ...editMeeting })
    const [selAttendees, setSelAttendees] = useState<number[]>(
      (editMeeting as Meeting)?.attendees?.map(m => m.id) || []
    )
    const [newPhotos, setNewPhotos] = useState<string[]>([]) // 새로 업로드된 URL들
    const [saving, setSaving] = useState(false)
    const [photoUploading, setPhotoUploading] = useState(false)
    const photoInputRef = useRef<HTMLInputElement>(null)
    const setF = (k: keyof Meeting, v: any) => setForm(prev => ({ ...prev, [k]: v }))
    const [attSearch, setAttSearch] = useState('')
    const toggleAtt = (id: number) => { setSelAttendees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); setAttSearch('') }
    const attCandidates = attSearch.length >= 1 ? members.filter(m => m.name.includes(attSearch) && !selAttendees.includes(m.id)) : []

    const handlePhotoFiles = async (files: FileList) => {
      setPhotoUploading(true)
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('meeting-photos').upload(fileName, file)
        if (!error) {
          const { data } = supabase.storage.from('meeting-photos').getPublicUrl(fileName)
          uploaded.push(data.publicUrl)
        }
      }
      setNewPhotos(prev => [...prev, ...uploaded])
      setPhotoUploading(false)
    }

    const save = async () => {
      setSaving(true)
      try {
        const { meeting_date, place, is_upcoming, food_rating, food_comment, comment } = form
        if (!meeting_date || !place) return

        let meetingId = form.id
        if (meetingId) {
          await supabase.from('meetings').update({ meeting_date, place, is_upcoming, food_rating, food_comment, comment }).eq('id', meetingId)
        } else {
          const { data } = await supabase.from('meetings').insert({ meeting_date, place, is_upcoming, food_rating, food_comment, comment }).select().single()
          meetingId = data?.id
        }

        if (meetingId && !is_upcoming) {
          await supabase.from('meeting_attendees').delete().eq('meeting_id', meetingId)
          if (selAttendees.length) {
            await supabase.from('meeting_attendees').insert(selAttendees.map(mid => ({ meeting_id: meetingId, member_id: mid })))
          }
        }

        // 새 사진 저장
        if (meetingId && newPhotos.length) {
          await supabase.from('meeting_photos').insert(newPhotos.map(url => ({ meeting_id: meetingId, url })))
        }

        await loadMeetings()
        setEditMeeting(null)
        // 수정된 모임 상세 화면으로 이동
        if (meetingId) {
          const { data: updated } = await supabase.from('meetings').select('*').eq('id', meetingId).single()
          if (updated) {
            const [{ data: att }, { data: exp }, { data: ph }] = await Promise.all([
              supabase.from('meeting_attendees').select('member_id, members(*)').eq('meeting_id', meetingId),
              supabase.from('meeting_expected').select('member_id, members(*)').eq('meeting_id', meetingId),
              supabase.from('meeting_photos').select('*').eq('meeting_id', meetingId),
            ])
            const enriched = {
              ...updated,
              attendees: (att || []).map((r: any) => r.members).filter(Boolean),
              expected: (exp || []).map((r: any) => r.members).filter(Boolean),
              photos: ph || [],
            }
            setSelMeeting(enriched)
            setPage('meetingDetail')
          }
        }
      } finally { setSaving(false) }
    }

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 500, overflowY: 'auto' }}>
        <div style={{ background: 'var(--surface)', minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>{form.id ? '모임 수정' : '모임 추가'}</div>
            <button onClick={() => setEditMeeting(null)} style={{ ...btn('outline'), padding: '6px 12px' }}>취소</button>
          </div>

          <div style={fieldWrap}>
            <label style={label}>날짜</label>
            <input type="date" value={form.meeting_date || ''} onChange={e => setF('meeting_date', e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <label style={label}>장소</label>
            <input value={form.place || ''} onChange={e => setF('place', e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <label style={label}>종류</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setF('is_upcoming', false)} style={{ ...btn(form.is_upcoming ? 'outline' : 'gold'), flex: 1 }}>완료된 모임</button>
              <button onClick={() => setF('is_upcoming', true)} style={{ ...btn(form.is_upcoming ? 'gold' : 'outline'), flex: 1 }}>예정 모임</button>
            </div>
          </div>

          {!form.is_upcoming && (
            <>
              <div style={fieldWrap}>
                <label style={label}>음식 평점</label>
                <StarRating value={form.food_rating || 0} onChange={v => setF('food_rating', v)} />
              </div>
              <div style={fieldWrap}>
                <label style={label}>음식 평가</label>
                <input value={form.food_comment || ''} onChange={e => setF('food_comment', e.target.value)} style={inputStyle} />
              </div>
              <div style={fieldWrap}>
                <label style={label}>모임 소감</label>
                <textarea value={form.comment || ''} onChange={e => setF('comment', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={fieldWrap}>
                <label style={label}>참석자 입력</label>
                {/* 선택된 참석자 태그 */}
                {selAttendees.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {selAttendees.map(id => {
                      const m = members.find(x => x.id === id)
                      return m ? (
                        <span key={id} onClick={() => toggleAtt(id)} style={{
                          background: 'var(--crimson)', color: '#fff',
                          borderRadius: 20, padding: '4px 10px', fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>{m.name} <span style={{ fontSize: 11, opacity: 0.8 }}>✕</span></span>
                      ) : null
                    })}
                  </div>
                )}
                {/* 검색 입력 */}
                <div style={{ position: 'relative' }}>
                  <input
                    value={attSearch}
                    onChange={e => setAttSearch(e.target.value)}
                    placeholder="이름 입력 (예: 김, 이)"
                    style={{ ...inputStyle }}
                  />
                  {attCandidates.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: 'var(--surface2)', border: '1px solid var(--crimson-dim)',
                      borderRadius: 8, zIndex: 10, overflow: 'hidden', marginTop: 2,
                    }}>
                      {attCandidates.map(m => (
                        <div key={m.id} onClick={() => toggleAtt(m.id)} style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                          borderBottom: '1px solid var(--crimson-bg)',
                        }}>{m.name} <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{m.grade}기 · {m.company}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 모임 사진 업로드 */}
              <div style={fieldWrap}>
                <label style={label}>모임 사진</label>
                {/* 기존 사진 */}
                {((editMeeting as Meeting)?.photos?.length || 0) > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                    {(editMeeting as Meeting)?.photos?.map(p => (
                      <div key={p.id} style={{ position: 'relative' }}>
                        <img src={p.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                        <button
                          onClick={async () => {
                            await supabase.from('meeting_photos').delete().eq('id', p.id)
                            await loadMeetings()
                          }}
                          style={{ position: 'absolute', top: 4, right: 4, background: '#c0392b', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* 새 사진 미리보기 */}
                {newPhotos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                    {newPhotos.map((url, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                        <button
                          onClick={() => setNewPhotos(prev => prev.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', top: 4, right: 4, background: '#c0392b', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff', fontSize: 12, cursor: 'pointer' }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  style={{ ...btn('outline'), width: '100%', padding: 12 }}
                >
                  {photoUploading ? '업로드 중...' : '📷 사진 추가 (여러 장 선택 가능)'}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.length) handlePhotoFiles(e.target.files) }}
                />
              </div>
            </>
          )}

          <button onClick={save} disabled={saving} style={{ ...btn(), width: '100%', padding: 14, fontSize: 16, opacity: saving ? 0.7 : 1 }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── 공지사항 ──────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const NoticesPage = () => (
    <div style={{ paddingBottom: 100 }}>
      <div style={header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-serif)' }}>공지사항</div>
          {isAdmin && (
            <button onClick={() => setEditNotice({ title: '', content: '', author: '관리자' })} style={{ ...btn(), fontSize: 12 }}>+ 작성</button>
          )}
        </div>
      </div>
      <div style={{ padding: '16px 20px 0' }}>
        {notices.map(n => (
          <div key={n.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{n.title}</div>
              {isAdmin && (
                <button onClick={async () => {
                  if (!confirm('삭제하시겠습니까?')) return
                  await supabase.from('notices').delete().eq('id', n.id)
                  await loadNotices()
                }} style={{ ...btn('red'), padding: '2px 8px', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>삭제</button>
              )}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>{n.content}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{n.created_at?.slice(0, 10)} · {n.author}</div>
          </div>
        ))}
        {notices.length === 0 && <div style={{ textAlign: 'center', color: '#555', padding: 40 }}>공지사항이 없습니다</div>}
      </div>
    </div>
  )

  // ── 공지 편집 모달 ─────────────────────────────────────────────────────
  const NoticeEditModal = () => {
    const [form, setForm] = useState<Partial<Notice>>({ ...editNotice })
    const [saving, setSaving] = useState(false)
    const save = async () => {
      if (!form.title || !form.content) return
      setSaving(true)
      try {
        if (form.id) await supabase.from('notices').update(form).eq('id', form.id)
        else await supabase.from('notices').insert(form)
        await loadNotices()
        setEditNotice(null)
      } finally { setSaving(false) }
    }
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 500, overflowY: 'auto' }}>
        <div style={{ background: 'var(--surface)', minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>공지 작성</div>
            <button onClick={() => setEditNotice(null)} style={{ ...btn('outline'), padding: '6px 12px' }}>취소</button>
          </div>
          <div style={fieldWrap}>
            <label style={label}>제목</label>
            <input value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <label style={label}>내용</label>
            <textarea value={form.content || ''} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={8} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <button onClick={save} disabled={saving} style={{ ...btn(), width: '100%', padding: 14 }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── 렌더 ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  const activeNav = ['members', 'org'].includes(page) ? page
    : page === 'memberDetail' ? 'members'
      : page === 'meetingDetail' ? 'meetings'
        : page

  if (phase === 'splash') return <Splash onDone={() => setPhase('pin')} />
  if (phase === 'pin') return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PinModal type="entry" title="계상회 입장" onSuccess={() => setPhase('app')} onCancel={() => { }} />
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 70 }}>
      {loading && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, height: 2, background: 'linear-gradient(90deg, var(--bg), var(--gold), var(--bg))', zIndex: 9999, animation: 'fadeIn 0.3s' }} />
      )}

      {page === 'home' && <HomePage />}
      {page === 'members' && <MembersPage />}
      {page === 'memberDetail' && <MemberDetailPage />}
      {page === 'org' && <OrgPage />}
      {page === 'meetings' && <MeetingsPage />}
      {page === 'meetingDetail' && <MeetingDetailPage />}
      {page === 'notices' && <NoticesPage />}

      {editMember && <MemberEditModal />}
      {editMeeting && <MeetingEditModal />}
      {editNotice && <NoticeEditModal />}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <img src={lightbox} alt="사진 크게보기" style={{
            maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12,
          }} />
          <button onClick={() => setLightbox(null)} style={{
            position: 'absolute', top: 20, right: 20,
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
            width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer',
          }}>✕</button>
        </div>
      )}
      {pinModal && <PinModal type={pinModal.type} title={pinModal.title} onSuccess={pinModal.onSuccess} onCancel={() => setPinModal(null)} />}

      <BottomNav current={activeNav} onChange={nav} />
    </div>
  )
}
