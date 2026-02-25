import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .order('grade')
    .order('name')

  if (!members) return NextResponse.json({ error: 'fetch failed' }, { status: 500 })

  const header = '이름,기수,휴대폰,이메일,회사,부서,직급,주소,전직장,메모'
  const rows = members.map((m: any) =>
    [m.name, `${m.grade}기`, m.mobile, m.email, m.company, m.department, m.position, m.address, m.prev_company, m.memo]
      .map((v: string) => `"${(v || '').replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = '\uFEFF' + [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('계상회_회원명부')}.csv`,
    },
  })
}
