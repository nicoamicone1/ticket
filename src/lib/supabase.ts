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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => {
      console.log('Custom Fetch interceptor triggered');
      console.log('URL:', url);
      console.log('Options:', options);
      if (options?.headers) {
        const headersObj: Record<string, string> = {};
        try {
          if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => {
              headersObj[key] = value;
            });
          } else if (Array.isArray(options.headers)) {
            options.headers.forEach(([key, value]) => {
              headersObj[key] = value;
            });
          } else {
            Object.assign(headersObj, options.headers);
          }
          console.log('Headers Object:', headersObj);
          
          for (const [key, value] of Object.entries(headersObj)) {
            console.log(`Header "${key}" details:`, {
              type: typeof value,
              length: String(value).length,
              valueSample: String(value).substring(0, 15),
              hasNewlines: /[\r\n]/.test(String(value)),
              hasSpaces: /\s/.test(String(value)),
            });
          }
        } catch (err) {
          console.error('Error logging headers:', err);
        }
      }
      return fetch(url, options);
    }
  }
});
