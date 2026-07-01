import { createClient } from '@supabase/supabase-js';

const sanitizeEnvVar = (val: string | undefined) => {
  if (!val) return undefined;
  let cleaned = val.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  // Remove any whitespace, newlines, or carriage returns from anywhere in the string
  return cleaned.replace(/\s+/g, '');
};

const supabaseUrl = sanitizeEnvVar(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = sanitizeEnvVar(import.meta.env.VITE_SUPABASE_ANON_KEY);

console.log('Supabase Client Config:', {
  hasUrl: !!supabaseUrl,
  urlStart: supabaseUrl?.substring(0, 15),
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length,
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
