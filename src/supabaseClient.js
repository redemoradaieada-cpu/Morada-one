import { createClient } from '@supabase/supabase-js'

// Retorna a URL correta do banco de dados local dependendo de como o usuário abriu o site:
// Se abriu via Vite (:5173), a API está na porta :54151
// Se abriu via Nginx (sem porta/porta :80), a API está na própria URL principal
const getLocalUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return `http://${window.location.hostname}:54151`;
    }
    return window.location.origin;
  }
  return 'http://localhost:54151';
};

const localUrl = getLocalUrl();
const localAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const cloudUrl = 'https://oeebmtzeupdvheyfwxtk.supabase.co/'
const cloudAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lZWJtdHpldXBkdmhleWZ3eHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjM2NjUsImV4cCI6MjA5NjQ5OTY2NX0.PDptAeoTHYrjPf4y6N3oYFOWi-vWPGiof1xzP-XXYOs'

const isLocal = () => {
  const host = window.location.hostname;
  return (
    host === 'localhost' || 
    host === '127.0.0.1' || 
    host.startsWith('192.168.') || 
    host.startsWith('10.') || 
    host.startsWith('172.')
  );
};

export const supabase = createClient(isLocal() ? localUrl : cloudUrl, isLocal() ? localAnonKey : cloudAnonKey)
export const supabaseCloud = createClient(cloudUrl, cloudAnonKey)