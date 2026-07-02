import { authApi } from './authApi';

// Tipagem baseada no ColaboradorResponseDTO do Python
export interface ColaboradorDTO {
  id: number;
  nome: string;
  id_profissional_responsavel: number;
  is_tecnico: boolean;
  email: string;
  cft?: string;
  uf?: string;
  cidade?: string;
  empresa_ou_orgao?: string;
  telefone?: string;
  instituicao_ensino?: string;
  limite_acesso?: string; 
  acesso_liberado: boolean;
  status: string;
}

export const colaboradoresService = {
  // GET /api/colaboradores/ - Lista todos os colaboradores
  listarTodos: async (): Promise<ColaboradorDTO[]> => {
    // Adicionado o prefixo /api e mantida a barra final para casar com o @router.get("/") do Python
    const response = await authApi.get('/api/colaboradores/');
    return response.data;
  },

  // PATCH /api/colaboradores/{id}/acesso - Alterna entre liberado/bloqueado
  alternarAcesso: async (id: number): Promise<ColaboradorDTO> => {
    // Adicionado o prefixo /api
    const response = await authApi.patch(`/api/colaboradores/${id}/acesso`);
    return response.data;
  },

  // PATCH /api/colaboradores/{id}/limite-acesso - Atualiza a data de validade
  atualizarLimite: async (id: number, novaData: string): Promise<ColaboradorDTO> => {
    // Converte YYYY-MM-DD para o formato datetime esperado pelo Python
    const dataFormatada = new Date(`${novaData}T23:59:59Z`).toISOString();
    
    // Adicionado o prefixo /api
    const response = await authApi.patch(`/api/colaboradores/${id}/limite-acesso`, {
      limite_acesso: dataFormatada
    });
    return response.data;
  }
};