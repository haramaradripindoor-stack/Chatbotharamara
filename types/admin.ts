export interface Lead {
  id: string;
  nombre: string;
  telefono: string;
  canal: string;
  estado: string;
  intent_score: number;
  listo_comprar: boolean;
  modo_manual: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  role: string;
  content: string;
  created_at: string;
}
