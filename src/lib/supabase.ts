import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('SUPABASE_URL:', supabaseUrl)
console.log('SUPABASE_KEY:', supabaseAnonKey?.substring(0, 50) + '...')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create client with arch schema as default
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'arch' }
})

// Expose for debugging
;(window as any).__SUPABASE__ = supabase
;(window as any).__SUPABASE_KEY__ = supabaseAnonKey

export interface Rule {
  id: string
  jurisdiction: string
  doc_type: string
  parent_id: string | null
  level: number
  ordinal: number | null
  heading: string | null
  body: string | null
  effective_date: string | null
  repeal_date: string | null
  source_url: string | null
  source_path: string | null
  rulespec_path: string | null
  has_rulespec: boolean
  created_at: string
  updated_at: string
}

export interface RuleStats {
  jurisdiction: string
  count: number
}
