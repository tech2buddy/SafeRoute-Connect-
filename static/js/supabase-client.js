import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Only public credentials belong here. Never add a service-role or secret key.
export const supabase = createClient(
    'https://lpbmswrvezvtrwhbsewt.supabase.co',
    'sb_publishable_VmqnWLfcfuQZ2yOnLEz7xg_W3MmVCjp'
);
