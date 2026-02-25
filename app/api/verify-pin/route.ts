import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { type, pin } = await req.json()

  const pins: Record<string, string> = {
    entry:  process.env.ENTRY_PIN  || '1234',
    member: process.env.MEMBER_PIN || '5678',
    admin:  process.env.ADMIN_PIN  || '9999',
  }

  const correct = pins[type]
  if (!correct) return NextResponse.json({ ok: false }, { status: 400 })

  return NextResponse.json({ ok: pin === correct })
}
