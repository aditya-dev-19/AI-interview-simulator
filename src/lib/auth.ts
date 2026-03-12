import { createClient } from "@/utils/supabase/server";

export async function signup(email: string, password: string, fullName: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) throw error;

  return data;
}

export async function login(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  return data;
}

export async function oauthLogin(provider: "google" | "github") {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider
  });

  if (error) throw error;

  return data;
}

// export async function logout() {
//   const supabase = await createClient();

//   const { error } = await supabase.auth.signOut();

//   if (error) throw error;

//   return { success: true };
// }

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}
