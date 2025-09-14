import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://trhogwinqistpnnpidql.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyaG9nd2lucWlzdHBubnBpZHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDc1NjIsImV4cCI6MjA3MzE4MzU2Mn0.yB8Z4td_-xMCwEuAyupgK3Ji877CpC6atxKF77G-r3s";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
