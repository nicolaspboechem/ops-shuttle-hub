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
      evento_usuarios: {
        Row: {
          created_at: string | null
          evento_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          evento_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          evento_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_usuarios_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          data_criacao: string
          data_fim: string | null
          data_inicio: string | null
          data_ultima_sync: string
          descricao: string | null
          habilitar_checkin: boolean | null
          id: string
          imagem_banner: string | null
          imagem_logo: string | null
          local: string | null
          nome_planilha: string
          status: string | null
          tipo_operacao: string | null
          total_viagens: number | null
          visivel_publico: boolean | null
        }
        Insert: {
          data_criacao?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_ultima_sync?: string
          descricao?: string | null
          habilitar_checkin?: boolean | null
          id?: string
          imagem_banner?: string | null
          imagem_logo?: string | null
          local?: string | null
          nome_planilha: string
          status?: string | null
          tipo_operacao?: string | null
          total_viagens?: number | null
          visivel_publico?: boolean | null
        }
        Update: {
          data_criacao?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_ultima_sync?: string
          descricao?: string | null
          habilitar_checkin?: boolean | null
          id?: string
          imagem_banner?: string | null
          imagem_logo?: string | null
          local?: string | null
          nome_planilha?: string
          status?: string | null
          tipo_operacao?: string | null
          total_viagens?: number | null
          visivel_publico?: boolean | null
        }
        Relationships: []
      }
      missoes: {
        Row: {
          atualizado_por: string | null
          created_at: string | null
          criado_por: string | null
          data_atualizacao: string | null
          descricao: string | null
          evento_id: string
          horario_previsto: string | null
          id: string
          motorista_id: string
          ponto_desembarque: string | null
          ponto_embarque: string | null
          prioridade: string | null
          status: string | null
          titulo: string
          viagem_id: string | null
        }
        Insert: {
          atualizado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_atualizacao?: string | null
          descricao?: string | null
          evento_id: string
          horario_previsto?: string | null
          id?: string
          motorista_id: string
          ponto_desembarque?: string | null
          ponto_embarque?: string | null
          prioridade?: string | null
          status?: string | null
          titulo: string
          viagem_id?: string | null
        }
        Update: {
          atualizado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_atualizacao?: string | null
          descricao?: string | null
          evento_id?: string
          horario_previsto?: string | null
          id?: string
          motorista_id?: string
          ponto_desembarque?: string | null
          ponto_embarque?: string | null
          prioridade?: string | null
          status?: string | null
          titulo?: string
          viagem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missoes_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missoes_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      motorista_presenca: {
        Row: {
          checkin_at: string | null
          checkout_at: string | null
          created_at: string
          data: string
          evento_id: string
          id: string
          motorista_id: string
          observacao_checkout: string | null
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          checkin_at?: string | null
          checkout_at?: string | null
          created_at?: string
          data?: string
          evento_id: string
          id?: string
          motorista_id: string
          observacao_checkout?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          checkin_at?: string | null
          checkout_at?: string | null
          created_at?: string
          data?: string
          evento_id?: string
          id?: string
          motorista_id?: string
          observacao_checkout?: string | null
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motorista_presenca_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motorista_presenca_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motorista_presenca_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          ativo: boolean | null
          atualizado_por: string | null
          cnh: string | null
          criado_por: string | null
          data_atualizacao: string
          data_criacao: string
          evento_id: string | null
          id: string
          nome: string
          observacao: string | null
          status: string | null
          telefone: string | null
          user_id: string | null
          veiculo_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_por?: string | null
          cnh?: string | null
          criado_por?: string | null
          data_atualizacao?: string
          data_criacao?: string
          evento_id?: string | null
          id?: string
          nome: string
          observacao?: string | null
          status?: string | null
          telefone?: string | null
          user_id?: string | null
          veiculo_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_por?: string | null
          cnh?: string | null
          criado_por?: string | null
          data_atualizacao?: string
          data_criacao?: string
          evento_id?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          status?: string | null
          telefone?: string | null
          user_id?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoristas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_motoristas: {
        Row: {
          created_at: string | null
          id: string
          motorista_id: string
          ponto_id: string
          prioridade: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          motorista_id: string
          ponto_id: string
          prioridade?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          motorista_id?: string
          ponto_id?: string
          prioridade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_motoristas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_motoristas_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "pontos_embarque"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos_embarque: {
        Row: {
          ativo: boolean | null
          atualizado_por: string | null
          created_at: string | null
          criado_por: string | null
          data_atualizacao: string | null
          endereco: string | null
          evento_id: string
          id: string
          nome: string
          observacao: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_atualizacao?: string | null
          endereco?: string | null
          evento_id: string
          id?: string
          nome: string
          observacao?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_atualizacao?: string | null
          endereco?: string | null
          evento_id?: string
          id?: string
          nome?: string
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pontos_embarque_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          login_type: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          login_type?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id: string
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          login_type?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      rotas_shuttle: {
        Row: {
          ativo: boolean | null
          atualizado_por: string | null
          created_at: string | null
          criado_por: string | null
          data_atualizacao: string | null
          destino: string
          evento_id: string
          frequencia_minutos: number | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_atualizacao?: string | null
          destino: string
          evento_id: string
          frequencia_minutos?: number | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          data_atualizacao?: string | null
          destino?: string
          evento_id?: string
          frequencia_minutos?: number | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotas_shuttle_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculo_fotos: {
        Row: {
          area_veiculo: string | null
          criado_por: string | null
          data_criacao: string | null
          descricao: string | null
          id: string
          ordem: number | null
          tipo: string | null
          url: string
          veiculo_id: string
        }
        Insert: {
          area_veiculo?: string | null
          criado_por?: string | null
          data_criacao?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          tipo?: string | null
          url: string
          veiculo_id: string
        }
        Update: {
          area_veiculo?: string | null
          criado_por?: string | null
          data_criacao?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          tipo?: string | null
          url?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculo_fotos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number | null
          ativo: boolean | null
          atualizado_por: string | null
          capacidade: number | null
          criado_por: string | null
          data_atualizacao: string
          data_criacao: string
          evento_id: string | null
          fornecedor: string | null
          id: string
          inspecao_dados: Json | null
          inspecao_data: string | null
          inspecao_por: string | null
          km_final: number | null
          km_final_data: string | null
          km_final_registrado_por: string | null
          km_inicial: number | null
          km_inicial_data: string | null
          km_inicial_registrado_por: string | null
          liberado_em: string | null
          liberado_por: string | null
          marca: string | null
          modelo: string | null
          motorista_id: string | null
          nivel_combustivel: string | null
          nome: string | null
          observacoes_gerais: string | null
          placa: string
          possui_avarias: boolean | null
          status: string | null
          tipo_veiculo: string
        }
        Insert: {
          ano?: number | null
          ativo?: boolean | null
          atualizado_por?: string | null
          capacidade?: number | null
          criado_por?: string | null
          data_atualizacao?: string
          data_criacao?: string
          evento_id?: string | null
          fornecedor?: string | null
          id?: string
          inspecao_dados?: Json | null
          inspecao_data?: string | null
          inspecao_por?: string | null
          km_final?: number | null
          km_final_data?: string | null
          km_final_registrado_por?: string | null
          km_inicial?: number | null
          km_inicial_data?: string | null
          km_inicial_registrado_por?: string | null
          liberado_em?: string | null
          liberado_por?: string | null
          marca?: string | null
          modelo?: string | null
          motorista_id?: string | null
          nivel_combustivel?: string | null
          nome?: string | null
          observacoes_gerais?: string | null
          placa: string
          possui_avarias?: boolean | null
          status?: string | null
          tipo_veiculo?: string
        }
        Update: {
          ano?: number | null
          ativo?: boolean | null
          atualizado_por?: string | null
          capacidade?: number | null
          criado_por?: string | null
          data_atualizacao?: string
          data_criacao?: string
          evento_id?: string | null
          fornecedor?: string | null
          id?: string
          inspecao_dados?: Json | null
          inspecao_data?: string | null
          inspecao_por?: string | null
          km_final?: number | null
          km_final_data?: string | null
          km_final_registrado_por?: string | null
          km_inicial?: number | null
          km_inicial_data?: string | null
          km_inicial_registrado_por?: string | null
          liberado_em?: string | null
          liberado_por?: string | null
          marca?: string | null
          modelo?: string | null
          motorista_id?: string | null
          nivel_combustivel?: string | null
          nome?: string | null
          observacoes_gerais?: string | null
          placa?: string
          possui_avarias?: boolean | null
          status?: string | null
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
      viagem_logs: {
        Row: {
          acao: string
          created_at: string | null
          detalhes: Json | null
          id: string
          user_id: string
          viagem_id: string
        }
        Insert: {
          acao: string
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          user_id: string
          viagem_id: string
        }
        Update: {
          acao?: string
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          user_id?: string
          viagem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viagem_logs_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      viagens: {
        Row: {
          atualizado_por: string | null
          coordenador: string | null
          criado_por: string | null
          data_atualizacao: string
          data_criacao: string
          encerrado: boolean | null
          evento_id: string | null
          finalizado_por: string | null
          h_chegada: string | null
          h_fim_real: string | null
          h_inicio_real: string | null
          h_pickup: string | null
          h_retorno: string | null
          id: string
          iniciado_por: string | null
          motorista: string
          observacao: string | null
          origem_missao_id: string | null
          placa: string | null
          ponto_desembarque: string | null
          ponto_embarque: string | null
          qtd_pax: number | null
          qtd_pax_retorno: number | null
          status: string | null
          tipo_operacao: string
          tipo_veiculo: string | null
          viagem_pai_id: string | null
        }
        Insert: {
          atualizado_por?: string | null
          coordenador?: string | null
          criado_por?: string | null
          data_atualizacao?: string
          data_criacao?: string
          encerrado?: boolean | null
          evento_id?: string | null
          finalizado_por?: string | null
          h_chegada?: string | null
          h_fim_real?: string | null
          h_inicio_real?: string | null
          h_pickup?: string | null
          h_retorno?: string | null
          id?: string
          iniciado_por?: string | null
          motorista: string
          observacao?: string | null
          origem_missao_id?: string | null
          placa?: string | null
          ponto_desembarque?: string | null
          ponto_embarque?: string | null
          qtd_pax?: number | null
          qtd_pax_retorno?: number | null
          status?: string | null
          tipo_operacao: string
          tipo_veiculo?: string | null
          viagem_pai_id?: string | null
        }
        Update: {
          atualizado_por?: string | null
          coordenador?: string | null
          criado_por?: string | null
          data_atualizacao?: string
          data_criacao?: string
          encerrado?: boolean | null
          evento_id?: string | null
          finalizado_por?: string | null
          h_chegada?: string | null
          h_fim_real?: string | null
          h_inicio_real?: string | null
          h_pickup?: string | null
          h_retorno?: string | null
          id?: string
          iniciado_por?: string | null
          motorista?: string
          observacao?: string | null
          origem_missao_id?: string | null
          placa?: string | null
          ponto_desembarque?: string | null
          ponto_embarque?: string | null
          qtd_pax?: number | null
          qtd_pax_retorno?: number | null
          status?: string | null
          tipo_operacao?: string
          tipo_veiculo?: string | null
          viagem_pai_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viagens_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_origem_missao_id_fkey"
            columns: ["origem_missao_id"]
            isOneToOne: false
            referencedRelation: "missoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_viagem_pai_id_fkey"
            columns: ["viagem_pai_id"]
            isOneToOne: false
            referencedRelation: "viagens"
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
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_permission:
        | "view_trips"
        | "edit_trips"
        | "manage_drivers_vehicles"
        | "export_data"
      app_role: "admin" | "user"
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
    Enums: {
      app_permission: [
        "view_trips",
        "edit_trips",
        "manage_drivers_vehicles",
        "export_data",
      ],
      app_role: ["admin", "user"],
    },
  },
} as const
