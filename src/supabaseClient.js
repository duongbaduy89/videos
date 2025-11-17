import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nrghfrgkpztluhoayqmq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yZ2hmcmdrcHp0bHVob2F5cW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzQ1MDAsImV4cCI6MjA3ODU1MDUwMH0.Gu9x8gMAJOqfErtK-aHTamW0zDR7oPMC4McC217C_UE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
