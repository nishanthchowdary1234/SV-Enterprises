
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log('Testing fetch reviews with join...');
    const { data, error } = await supabase
        .from('reviews')
        .select('*, user:profiles(full_name)')
        .limit(5);

    if (error) {
        console.error('Error fetching reviews:', error);
    } else {
        console.log('Fetched reviews:', data);
    }
}

testFetch();
