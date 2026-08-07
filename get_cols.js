import { createClient } from '@supabase/supabase-js';

const cloudUrl = 'https://oeebmtzeupdvheyfwxtk.supabase.co/';
const cloudAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lZWJtdHpldXBkdmhleWZ3eHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjM2NjUsImV4cCI6MjA5NjQ5OTY2NX0.PDptAeoTHYrjPf4y6N3oYFOWi-vWPGiof1xzP-XXYOs';

const supabase = createClient(cloudUrl, cloudAnonKey);

const tables = [
  'cidades', 'chamada_itens', 'niveis_acesso', 'perfis', 'perfil_eventos', 
  'pre_inscricoes', 'tarefas', 'tarefas_comentarios', 'tarefas_notificacoes', 'tarefas_responsaveis'
];

async function run() {
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Error on ${t}:`, error.message);
    } else {
      if (data.length > 0) {
        console.log(`Table ${t}: ['${Object.keys(data[0]).join("', '")}']`);
      } else {
        console.log(`Table ${t}: (No rows found)`);
      }
    }
  }
}

run();
