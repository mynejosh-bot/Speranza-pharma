import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://dptipfmxbsvamzwjlprs.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_8VKJiLnn4j6BNHs-NDMj5w_T0sv41EO';

export const supabase = createClient(supabaseUrl, supabaseKey);
