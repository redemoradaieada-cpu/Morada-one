import { supabase, supabaseCloud } from './supabaseClient';

let syncInterval = null;
let isSyncing = false;

// Determina se este cliente é a máquina local servindo como servidor
export const isLocalServer = () => {
  const host = window.location.hostname;
  return (
    host === 'localhost' || 
    host === '127.0.0.1' || 
    host.startsWith('192.168.') || 
    host.startsWith('10.') || 
    host.startsWith('172.')
  );
};

export function startSyncService(onStatusChange) {
  if (!isLocalServer()) {
    console.log('[Sync] Executando em ambiente de nuvem. Sincronizador inativo.');
    return;
  }

  if (syncInterval) return;

  console.log('[Sync] Inicializando sincronizador local automático...');
  
  // Executa imediatamente e depois a cada 15 segundos
  runSync(onStatusChange);
  syncInterval = setInterval(() => runSync(onStatusChange), 15000);
}

export function stopSyncService() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[Sync] Sincronizador desativado.');
  }
}

// Tenta logar na nuvem usando as credenciais do usuário salvas na sessão local
async function authenticateCloud() {
  const email = sessionStorage.getItem('sync_email');
  const password = sessionStorage.getItem('sync_password');
  
  if (email && password) {
    const { data: { session } } = await supabaseCloud.auth.getSession();
    if (!session) {
      console.log('[Sync] Autenticando na nuvem com usuário ativo...');
      const { error } = await supabaseCloud.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[Sync] Falha na autenticação da nuvem:', error.message);
      }
    }
  }
}

const TABLES_TO_SYNC = [
  { name: 'grupos', columns: ['id', 'nome', 'descricao', 'created_at', 'evento_id'] },
  { 
    name: 'produtos', 
    columns: ['id', 'nome', 'codigo_barras', 'preco', 'cor', 'tamanho', 'status', 'grupo_id', 'quantidade', 'created_at', 'evento_id'],
    options: { ignoreUpdateColumns: ['quantidade'] } // Evita que a nuvem zere/sobrescreva o estoque físico local
  },
  { name: 'acertos_caixa', columns: ['id', 'setor', 'valor_dinheiro', 'valor_pix', 'valor_credito', 'valor_debito', 'total_transferido', 'responsavel_id', 'created_at', 'evento_id'] },
  { name: 'vendas', columns: ['id', 'tipo', 'valor_total', 'doador', 'beneficiario', 'created_at', 'status', 'forma_pagamento', 'cliente_nome_praca', 'senha_pedido_praca', 'status_cozinha', 'acerto_id', 'evento_id'] },
  { name: 'itens_venda', columns: ['id', 'venda_id', 'produto_id', 'nome', 'quantidade'] },
  { name: 'reservas', columns: ['id', 'cliente_nome', 'cpf', 'telefone', 'produto_id', 'comprovante_url', 'status_pagamento', 'status_entrega', 'created_at', 'assinatura_url', 'quantidade', 'venda_id', 'evento_id'] },
  { name: 'tipos_inscricao', columns: ['id', 'nome', 'limite_vagas', 'valor', 'data_validade', 'inclui_hospedagem', 'created_at', 'evento_id'] },
  { name: 'quartos', columns: ['id', 'nome', 'tipo', 'capacidade', 'lider_inscrito_id', 'ala_andar', 'status', 'categoria', 'created_at', 'evento_id'] },
  { name: 'inscricoes_hospedagem', columns: ['id', 'nome_completo', 'cpf', 'data_nascimento', 'telefone', 'email', 'nome_pastor', 'regional', 'endereco', 'cidade', 'estado', 'forma_pagamento', 'tipo_inscricao_id', 'created_at', 'data_checkin', 'sexo', 'quarto_id', 'cidade_codigo', 'acerto_id', 'evento_id'] },
  { name: 'lancamentos_financeiros', columns: ['id', 'tipo', 'categoria', 'descricao', 'valor', 'data_lancamento', 'usuario_id', 'created_at', 'evento_id'] },
  { name: 'sessoes_chamada', columns: ['id', 'nome', 'criado_em', 'status', 'evento_id'] },
  { name: 'chamadas', columns: ['id', 'sessao_id', 'quarto_id', 'status', 'iniciada_em', 'concluida_em', 'created_at'] },
  { name: 'inscricao_parcelas', columns: ['id', 'inscricao_id', 'numero_parcela', 'valor', 'data_vencimento', 'status', 'data_pagamento', 'created_at'] },
  { name: 'ofertas_culto', columns: ['id', 'data_culto', 'periodo', 'valor_total', 'observacao', 'criado_por', 'created_at'] },
  { name: 'eventos', columns: ['id', 'nome', 'status', 'created_at'] },
  { name: 'cidades', columns: ['id', 'codigo', 'nome', 'uf', 'created_at'] },
  { name: 'chamada_itens', columns: ['id', 'chamada_id', 'inscricao_id', 'created_at'] },
  { name: 'niveis_acesso', columns: ['id', 'nome', 'telas_permitidas', 'acesso_global_eventos', 'created_at'] },
  { name: 'perfis', columns: ['id', 'email', 'nome_completo', 'nivel_acesso_id', 'created_at'] },
  { name: 'perfil_eventos', columns: ['id', 'perfil_id', 'evento_id', 'created_at'] },
  { name: 'pre_inscricoes', columns: ['id', 'nome_completo', 'cpf', 'telefone', 'email', 'cidade_codigo', 'evento_id', 'created_at'] },
  { name: 'tarefas', columns: ['id', 'titulo', 'descricao', 'status', 'prioridade', 'data_vencimento', 'setor', 'criado_por', 'evento_id', 'created_at'] },
  { name: 'tarefas_comentarios', columns: ['id', 'tarefa_id', 'usuario_id', 'comentario', 'created_at'] },
  { name: 'tarefas_notificacoes', columns: ['id', 'usuario_id', 'tarefa_id', 'tipo', 'mensagem', 'lida', 'created_at'] },
  { name: 'tarefas_responsaveis', columns: ['tarefa_id', 'usuario_id'] }
];

async function runSync(onStatusChange) {
  if (isSyncing) return;
  isSyncing = true;
  if (onStatusChange) onStatusChange('sincronizando');

  try {
    // 0. Autenticar na nuvem silenciosamente
    await authenticateCloud();

    // 1. Sincronizar dados da Nuvem ➔ Local (Download)
    let houveAlteracoesLocal = false;
    for (const table of TABLES_TO_SYNC) {
      const baixou = await syncTableCloudToLocal(table.name, table.columns, table.options);
      if (baixou) houveAlteracoesLocal = true;
    }

    // 2. Se baixou novos registros com ID serial da nuvem, ajusta as sequências locais do Postgres
    if (houveAlteracoesLocal) {
      await updateLocalSequences();
    }

    // 3. Sincronizar dados do Local ➔ Nuvem (Upload)
    for (const table of TABLES_TO_SYNC) {
      await syncTableLocalToCloud(table.name, table.columns);
    }

    // 4. Sincronizar Pré-Inscrições (Download Especial e Limpeza da Nuvem)
    await syncPreInscricoesCloudToLocal();

    if (onStatusChange) onStatusChange('sucesso');
  } catch (error) {
    console.error('[Sync Error] Falha na rodada de sincronização:', error);
    if (onStatusChange) onStatusChange('erro');
  } finally {
    isSyncing = false;
  }
}

// ==========================================
// FUNÇÕES AUXILIARES GENÉRICAS
// ==========================================

// Sincroniza tabelas da Nuvem para o Local
async function syncTableCloudToLocal(tableName, columns, options = {}) {
  try {
    const { data: clouds, error: errFetch } = await supabaseCloud
      .from(tableName)
      .select(columns.join(',') + ',sincronizado_local')
      .eq('sincronizado_local', false);

    if (errFetch) {
      // Falha comum se não houver internet ou RLS bloquear
      return false;
    }
    if (!clouds || clouds.length === 0) return false;

    console.log(`[Sync] Baixando ${clouds.length} atualizações da tabela ${tableName}...`);

    for (const item of clouds) {
      const cleanItem = { ...item };
      delete cleanItem.sincronizado_local;

      // Se configurado para ignorar atualizações de certas colunas (ex: quantidade de estoque físico)
      if (options.ignoreUpdateColumns && options.ignoreUpdateColumns.length > 0) {
        const { data: exist } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', item.id)
          .single();
        
        if (exist) {
          const updateData = { ...cleanItem };
          options.ignoreUpdateColumns.forEach(col => delete updateData[col]);
          
          const { error: errUp } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', item.id);

          if (!errUp) {
            await supabaseCloud
              .from(tableName)
              .update({ sincronizado_local: true })
              .eq('id', item.id);
          }
          continue;
        }
      }

      // Upsert local
      const { error: errLocal } = await supabase
        .from(tableName)
        .upsert(cleanItem, { onConflict: 'id' });

      if (!errLocal) {
        // Marca como sincronizado localmente na nuvem
        await supabaseCloud
          .from(tableName)
          .update({ sincronizado_local: true })
          .eq('id', item.id);
      } else {
        console.error(`[Sync] Falha ao inserir ${tableName} ID ${item.id} localmente:`, errLocal.message);
      }
    }
    return true;
  } catch (err) {
    console.error(`[Sync] Erro na tabela ${tableName} (Nuvem->Local):`, err);
    return false;
  }
}

// Sincroniza tabelas do Local para a Nuvem
async function syncTableLocalToCloud(tableName, columns) {
  try {
    const { data: locals, error: errFetch } = await supabase
      .from(tableName)
      .select(columns.join(',') + ',sincronizado_nuvem')
      .eq('sincronizado_nuvem', false);

    if (errFetch) return;
    if (!locals || locals.length === 0) return;

    console.log(`[Sync] Enviando ${locals.length} registros locais de ${tableName} para a nuvem...`);

    for (const item of locals) {
      const cleanItem = { ...item };
      delete cleanItem.sincronizado_nuvem;

      const { error: errCloud } = await supabaseCloud
        .from(tableName)
        .upsert(cleanItem, { onConflict: 'id' });

      if (!errCloud) {
        // Marca como sincronizado localmente
        await supabase
          .from(tableName)
          .update({ sincronizado_nuvem: true })
          .eq('id', item.id);
      } else {
        console.error(`[Sync] Falha ao enviar ${tableName} ID ${item.id} para a nuvem:`, errCloud.message);
      }
    }
  } catch (err) {
    console.error(`[Sync] Erro na tabela ${tableName} (Local->Nuvem):`, err);
  }
}

// Função especial para sincronizar Pré-Inscrições da Nuvem para o Local e remover da Nuvem
async function syncPreInscricoesCloudToLocal() {
  try {
    const { data: pres, error: errFetch } = await supabaseCloud
      .from('pre_inscricoes')
      .select('*');

    if (errFetch) return;
    if (!pres || pres.length === 0) return;

    console.log(`[Sync] Baixando ${pres.length} fichas de pré-inscrição da nuvem...`);

    for (const pre of pres) {
      // 1. Salva na base de pré-inscrições local
      const { error: errLocal } = await supabase
        .from('pre_inscricoes')
        .upsert({
          id: pre.id,
          nome_completo: pre.nome_completo,
          cpf: pre.cpf,
          data_nascimento: pre.data_nascimento,
          telefone: pre.telefone,
          email: pre.email,
          nome_pastor: pre.nome_pastor,
          regional: pre.regional,
          endereco: pre.endereco,
          cidade: pre.cidade,
          estado: pre.estado,
          tipo_inscricao_id: pre.tipo_inscricao_id,
          sexo: pre.sexo,
          cidade_codigo: pre.cidade_codigo,
          forma_pagamento: pre.forma_pagamento,
          created_at: pre.created_at
        }, { onConflict: 'id' });

      if (!errLocal) {
        // 2. Remove da nuvem (libera espaço e evita re-puxada)
        await supabaseCloud
          .from('pre_inscricoes')
          .delete()
          .eq('id', pre.id);
      } else {
        console.error(`[Sync] Erro ao salvar pré-inscrição local ID ${pre.id}:`, errLocal.message);
      }
    }
  } catch (err) {
    console.error('[Sync] Erro no fluxo especial de pré-inscrições:', err);
  }
}

// Aciona a função RPC criada no Postgres local para acertar os contadores de ID
async function updateLocalSequences() {
  try {
    const { error } = await supabase.rpc('ajustar_sequencias');
    if (error) throw error;
    console.log('[Sync] Sequências de IDs do banco local reajustadas.');
  } catch (err) {
    console.warn('[Sync] Não foi possível ajustar as sequências locais (RPC "ajustar_sequencias" pendente):', err.message);
  }
}
