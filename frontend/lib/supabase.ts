import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qeyqnrjicczwwwwivqep.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFleXFucmppY2N6d3d3d2l2cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDk0NjEsImV4cCI6MjA4ODk4NTQ2MX0.hSjcdmN2J7NeFVHvBZ0wF2_UwKpQa1Kpynh7hNNyuZ8"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
