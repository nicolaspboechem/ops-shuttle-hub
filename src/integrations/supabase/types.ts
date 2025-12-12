export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      eventos: {
        Row: {
          data_criacao: string
          data_ultima_sync: string
          id: string
          nome_planilha: string
          status: string | null
          tipo_operacao: string | null
          total_viagens: number | null
        }
        Insert: {
          data_criacao?: string
          data_ultima_sync?: string
          id?: string
          nome_planilha: string
          status?: string | null
          tipo_operacao?: string | null
          total_viagens?: number | null
        }
        Update: {
          data_criacao?: string
          data_ultima_sync?: string
          id?: string
          nome_planilha?: string
          status?: string | null
          tipo_operacao?: string | null
          total_viagens?: number | null
        }
        Relationships: []
      }
      motoristas: {
        Row: {
          ativo: boolean | null
          cnh: string | null
          data_atualizacao: string
          data_criacao: string
          evento_id: string | null
          id: string
          nome: string
          observacao: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnh?: string | null
          data_atualizacao?: string
          data_criacao?: string
          evento_id?: string | null
          id?: string
          nome: string
          observacao?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnh?: string | null
          data_atualizacao?: string
          data_criacao?: string
          evento_id?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number | null
          ativo: boolean | null
          capacidade: number | null
          data_atualizacao: string
          data_criacao: string
          evento_id: string | null
          id: string
          marca: string | null
          modelo: string | null
          motorista_id: string | null
          placa: string
          tipo_veiculo: string
        }
        Insert: {
          ano?: number | null
          ativo?: boolean | null
          capacidade?: number | null
          data_atualizacao?: string
          data_criacao?: string
          evento_id?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          motorista_id?: string | null
          placa: string
          tipo_veiculo?: string
        }
        Update: {
          ano?: number | null
          ativo?: boolean | null
          capacidade?: number | null
          data_atualizacao?: string
          data_criacao?: string
          evento_id?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          motorista_id?: string | null
          placa?: string
          tipo_veiculo?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      viagens: {
        Row: {
          coordenador: string | null
          data_atualizacao: string
          data_criacao: string
          encerrado: boolean | null
          evento_id: string | null
          h_chegada: string | null
          h_pickup: string | null
          h_retorno: string | null
          id: string
          motorista: string
          observacao: string | null
          placa: string | null
          ponto_embarque: string | null
          qtd_pax: number | null
          qtd_pax_retorno: number | null
          tipo_operacao: string
          tipo_veiculo: string | null
        }
        Insert: {
          coordenador?: string | null
          data_atualizacao?: string
          data_criacao?: string
          encerrado?: boolean | null
          evento_id?: string | null
          h_chegada?: string | null
          h_pickup?: string | null
          h_retorno?: string | null
          id?: string
          motorista: string
          observacao?: string | null
          placa?: string | null
          ponto_embarque?: string | null
          qtd_pax?: number | null
          qtd_pax_retorno?: number | null
          tipo_operacao: string
          tipo_veiculo?: string | null
        }
        Update: {
          coordenador?: string | null
          data_atualizacao?: string
          data_criacao?: string
          encerrado?: boolean | null
          evento_id?: string | null
          h_chegada?: string | null
          h_pickup?: string | null
          h_retorno?: string | null
          id?: string
          motorista?: string
          observacao?: string | null
          placa?: string | null
          ponto_embarque?: string | null
          qtd_pax?: number | null
          qtd_pax_retorno?: number | null
          tipo_operacao?: string
          tipo_veiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viagens_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_server_time: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
