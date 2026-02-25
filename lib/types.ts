export interface Member {
  id: number
  name: string
  grade: number
  mobile: string
  email: string
  company: string
  department: string
  position: string
  address: string
  prev_company: string
  memo: string
  bio: string
  photo_url: string
  created_at?: string
  updated_at?: string
}

export interface Meeting {
  id: number
  meeting_date: string
  place: string
  is_upcoming: boolean
  food_rating: number
  food_comment: string
  comment: string
  created_at?: string
  attendees?: Member[]
  expected?: Member[]
  photos?: MeetingPhoto[]
}

export interface MeetingPhoto {
  id: number
  meeting_id: number
  url: string
  created_at?: string
}

export interface Notice {
  id: number
  title: string
  content: string
  author: string
  created_at?: string
  updated_at?: string
}

export type PinType = 'entry' | 'member' | 'admin'
