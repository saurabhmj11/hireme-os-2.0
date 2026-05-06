import { createClient } from '@/utils/supabase/server';
import { db } from './db';

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return null;
  
  // Ensure the user exists in our local database
  // We do this lazily here or in a dedicated webhook
  const localUser = await db.user.findUnique({
    where: { email: user.email! }
  });
  
  if (!localUser) {
    return await db.user.create({
      data: {
        id: user.id, // Use Supabase ID as our primary key or link
        email: user.email!,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
      }
    });
  }
  
  return localUser;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}
