// config.js - Centralized Supabase Connection
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://uiejwoonkrwmqomckxsp.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZWp3b29ua3J3bXFvbWNreHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzU0ODEsImV4cCI6MjA5MTk1MTQ4MX0.vCuII5ND7cl0YPUrnHkSRqfn7tXun8ERqlkuRXjsi70';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
