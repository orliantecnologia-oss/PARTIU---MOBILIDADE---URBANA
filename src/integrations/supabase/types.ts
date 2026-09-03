export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      idempotency_keys: {
        Row: {
          key: string;
          request_hash: string;
          actor_id: string | null;
          command: string;
          status: string;
          response_payload: Json | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          key: string;
          request_hash: string;
          actor_id?: string | null;
          command: string;
          status?: string;
          response_payload?: Json | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          key?: string;
          request_hash?: string;
          actor_id?: string | null;
          command?: string;
          status?: string;
          response_payload?: Json | null;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      event_outbox: {
        Row: {
          id: string;
          tenant_id: string;
          aggregate_type: string;
          aggregate_id: string;
          event_type: string;
          payload: Json;
          correlation_id: string;
          status: string;
          retry_count: number;
          max_retries: number;
          last_error: string | null;
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string;
          aggregate_type: string;
          aggregate_id: string;
          event_type: string;
          payload: Json;
          correlation_id: string;
          status?: string;
          retry_count?: number;
          max_retries?: number;
          last_error?: string | null;
          created_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          aggregate_type?: string;
          aggregate_id?: string;
          event_type?: string;
          payload?: Json;
          correlation_id?: string;
          status?: string;
          retry_count?: number;
          max_retries?: number;
          last_error?: string | null;
          created_at?: string;
          published_at?: string | null;
        };
        Relationships: [];
      };
      event_dead_letters: {
        Row: {
          id: string;
          outbox_id: string | null;
          event_type: string;
          payload: Json;
          error_message: string;
          stack_trace: string | null;
          failed_at: string;
        };
        Insert: {
          id?: string;
          outbox_id?: string | null;
          event_type: string;
          payload: Json;
          error_message: string;
          stack_trace?: string | null;
          failed_at?: string;
        };
        Update: {
          id?: string;
          outbox_id?: string | null;
          event_type?: string;
          payload?: Json;
          error_message?: string;
          stack_trace?: string | null;
          failed_at?: string;
        };
        Relationships: [];
      };
      payment_intents: {
        Row: {
          id: string;
          reference_id: string;
          amount_cents: number;
          currency: string;
          status: string;
          psp_provider: string;
          client_secret: string | null;
          idempotency_key: string | null;
          metadata: Json | null;
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          reference_id: string;
          amount_cents: number;
          currency?: string;
          status?: string;
          psp_provider?: string;
          client_secret?: string | null;
          idempotency_key?: string | null;
          metadata?: Json | null;
          confirmed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reference_id?: string;
          amount_cents?: number;
          currency?: string;
          status?: string;
          psp_provider?: string;
          client_secret?: string | null;
          idempotency_key?: string | null;
          metadata?: Json | null;
          confirmed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_webhooks: {
        Row: {
          id: string;
          webhook_id: string;
          psp_provider: string;
          payload: Json;
          signature_header: string;
          verified: boolean;
          processed_at: string;
        };
        Insert: {
          id?: string;
          webhook_id: string;
          psp_provider: string;
          payload: Json;
          signature_header: string;
          verified?: boolean;
          processed_at?: string;
        };
        Update: {
          id?: string;
          webhook_id?: string;
          psp_provider?: string;
          payload?: Json;
          signature_header?: string;
          verified?: boolean;
          processed_at?: string;
        };
        Relationships: [];
      };
      financial_accounts: {
        Row: {
          id: string;
          code: string;
          name: string;
          type: string;
          balance_cents: number;
          created_at: string;
        };
        Insert: {
          id: string;
          code: string;
          name: string;
          type: string;
          balance_cents?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          type?: string;
          balance_cents?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      financial_ledger_entries: {
        Row: {
          id: string;
          transaction_id: string;
          entry_type: "DEBIT" | "CREDIT";
          account_id: string;
          amount_cents: number;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          entry_type: "DEBIT" | "CREDIT";
          account_id: string;
          amount_cents: number;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          entry_type?: "DEBIT" | "CREDIT";
          account_id?: string;
          amount_cents?: number;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      alertas_sos: {
        Row: {
          coordenadas: string | null;
          created_at: string;
          descricao: string | null;
          id: string;
          motorista_nome: string | null;
          rodovia: string | null;
          solicitante_nome: string;
          solicitante_telefone: string | null;
          status: string;
          tipo: string;
          van_placa: string | null;
        };
        Insert: {
          coordenadas?: string | null;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          motorista_nome?: string | null;
          rodovia?: string | null;
          solicitante_nome: string;
          solicitante_telefone?: string | null;
          status?: string;
          tipo: string;
          van_placa?: string | null;
        };
        Update: {
          coordenadas?: string | null;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          motorista_nome?: string | null;
          rodovia?: string | null;
          solicitante_nome?: string;
          solicitante_telefone?: string | null;
          status?: string;
          tipo?: string;
          van_placa?: string | null;
        };
        Relationships: [];
      };
      despesas_operacionais: {
        Row: {
          categoria: string;
          comprovante_url: string | null;
          conciliado: boolean;
          created_at: string;
          data_despesa: string;
          descricao: string;
          id: string;
          subcategoria: string | null;
          valor: number;
        };
        Insert: {
          categoria: string;
          comprovante_url?: string | null;
          conciliado?: boolean;
          created_at?: string;
          data_despesa?: string;
          descricao: string;
          id?: string;
          subcategoria?: string | null;
          valor: number;
        };
        Update: {
          categoria?: string;
          comprovante_url?: string | null;
          conciliado?: boolean;
          created_at?: string;
          data_despesa?: string;
          descricao?: string;
          id?: string;
          subcategoria?: string | null;
          valor?: number;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          ativo: boolean;
          created_at: string;
          id: string;
          imagem_url: string;
          link_destino: string | null;
          ordem: number;
          subtitulo: string | null;
          tag: string | null;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          imagem_url: string;
          link_destino?: string | null;
          ordem?: number;
          subtitulo?: string | null;
          tag?: string | null;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          imagem_url?: string;
          link_destino?: string | null;
          ordem?: number;
          subtitulo?: string | null;
          tag?: string | null;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fechamento_caixa: {
        Row: {
          created_at: string;
          data_referencia: string;
          fechado_em: string | null;
          id: string;
          motorista_id: string;
          status: string;
          taxa_cooperativa_pct: number;
          total_bruto: number;
          updated_at: string;
          valor_cooperativa: number;
          valor_liquido_motorista: number;
          viagem_id: string | null;
        };
        Insert: {
          created_at?: string;
          data_referencia?: string;
          fechado_em?: string | null;
          id?: string;
          motorista_id: string;
          status?: string;
          taxa_cooperativa_pct?: number;
          total_bruto?: number;
          updated_at?: string;
          valor_cooperativa?: number;
          valor_liquido_motorista?: number;
          viagem_id?: string | null;
        };
        Update: {
          created_at?: string;
          data_referencia?: string;
          fechado_em?: string | null;
          id?: string;
          motorista_id?: string;
          status?: string;
          taxa_cooperativa_pct?: number;
          total_bruto?: number;
          updated_at?: string;
          valor_cooperativa?: number;
          valor_liquido_motorista?: number;
          viagem_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fechamento_caixa_viagem_id_fkey";
            columns: ["viagem_id"];
            isOneToOne: false;
            referencedRelation: "viagens";
            referencedColumns: ["id"];
          },
        ];
      };
      linhas: {
        Row: {
          ativo: boolean;
          created_at: string;
          destino: string;
          destino_lat: number;
          destino_lng: number;
          destino_sigla: string | null;
          distancia_km: number;
          duracao_base_minutos: number;
          id: string;
          origem: string;
          origem_lat: number;
          origem_lng: number;
          origem_sigla: string | null;
          tipo_van_padrao: string | null;
          updated_at: string;
          valor_passagem: number;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          destino: string;
          destino_lat: number;
          destino_lng: number;
          destino_sigla?: string | null;
          distancia_km: number;
          duracao_base_minutos: number;
          id?: string;
          origem: string;
          origem_lat: number;
          origem_lng: number;
          origem_sigla?: string | null;
          tipo_van_padrao?: string | null;
          updated_at?: string;
          valor_passagem: number;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          destino?: string;
          destino_lat?: number;
          destino_lng?: number;
          destino_sigla?: string | null;
          distancia_km?: number;
          duracao_base_minutos?: number;
          id?: string;
          origem?: string;
          origem_lat?: number;
          origem_lng?: number;
          origem_sigla?: string | null;
          tipo_van_padrao?: string | null;
          updated_at?: string;
          valor_passagem?: number;
        };
        Relationships: [];
      };
      passagens: {
        Row: {
          codigo_bilhete: string;
          codigo_qr: string;
          created_at: string;
          embarcado_em: string | null;
          forma_pagamento: string;
          id: string;
          passageiro_cpf: string;
          passageiro_id: string;
          passageiro_nome: string;
          passageiro_whatsapp: string;
          pix_copia_cola: string | null;
          pix_expira_em: string;
          pix_txid: string | null;
          ponto_embarque_id: string | null;
          quantidade_passagens: number;
          status_embarque: string;
          status_pagamento: string;
          updated_at: string;
          valor_total: number;
          viagem_id: string;
        };
        Insert: {
          codigo_bilhete: string;
          codigo_qr: string;
          created_at?: string;
          embarcado_em?: string | null;
          forma_pagamento?: string;
          id?: string;
          passageiro_cpf: string;
          passageiro_id: string;
          passageiro_nome: string;
          passageiro_whatsapp: string;
          pix_copia_cola?: string | null;
          pix_expira_em?: string;
          pix_txid?: string | null;
          ponto_embarque_id?: string | null;
          quantidade_passagens?: number;
          status_embarque?: string;
          status_pagamento?: string;
          updated_at?: string;
          valor_total: number;
          viagem_id: string;
        };
        Update: {
          codigo_bilhete?: string;
          codigo_qr?: string;
          created_at?: string;
          embarcado_em?: string | null;
          forma_pagamento?: string;
          id?: string;
          passageiro_cpf?: string;
          passageiro_id?: string;
          passageiro_nome?: string;
          passageiro_whatsapp?: string;
          pix_copia_cola?: string | null;
          pix_expira_em?: string;
          pix_txid?: string | null;
          ponto_embarque_id?: string | null;
          quantidade_passagens?: number;
          status_embarque?: string;
          status_pagamento?: string;
          updated_at?: string;
          valor_total?: number;
          viagem_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "passagens_ponto_embarque_id_fkey";
            columns: ["ponto_embarque_id"];
            isOneToOne: false;
            referencedRelation: "pontos_embarque";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "passagens_viagem_id_fkey";
            columns: ["viagem_id"];
            isOneToOne: false;
            referencedRelation: "viagens";
            referencedColumns: ["id"];
          },
        ];
      };
      pontos_embarque: {
        Row: {
          ativo: boolean;
          cidade: string;
          comodidades: string[] | null;
          created_at: string;
          distancia_km_estimada: number | null;
          endereco_completo: string | null;
          foto_url: string | null;
          id: string;
          lat: number | null;
          linha_id: string | null;
          lng: number | null;
          minutos_apos_saida: number;
          nome: string;
          observacao_operacional: string | null;
          ordem: number;
          referencia: string;
          tipo: string;
          tipo_rotulo: string;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          cidade: string;
          comodidades?: string[] | null;
          created_at?: string;
          distancia_km_estimada?: number | null;
          endereco_completo?: string | null;
          foto_url?: string | null;
          id?: string;
          lat?: number | null;
          linha_id?: string | null;
          lng?: number | null;
          minutos_apos_saida?: number;
          nome: string;
          observacao_operacional?: string | null;
          ordem?: number;
          referencia: string;
          tipo: string;
          tipo_rotulo: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          cidade?: string;
          comodidades?: string[] | null;
          created_at?: string;
          distancia_km_estimada?: number | null;
          endereco_completo?: string | null;
          foto_url?: string | null;
          id?: string;
          lat?: number | null;
          linha_id?: string | null;
          lng?: number | null;
          minutos_apos_saida?: number;
          nome?: string;
          observacao_operacional?: string | null;
          ordem?: number;
          referencia?: string;
          tipo?: string;
          tipo_rotulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pontos_embarque_linha_id_fkey";
            columns: ["linha_id"];
            isOneToOne: false;
            referencedRelation: "linhas";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          cidade_origem_padrao: string | null;
          cpf: string | null;
          created_at: string;
          full_name: string | null;
          gps_lat: number | null;
          gps_lng: number | null;
          id: string;
          phone: string | null;
          ponto_embarque_padrao_id: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          cidade_origem_padrao?: string | null;
          cpf?: string | null;
          created_at?: string;
          full_name?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id: string;
          phone?: string | null;
          ponto_embarque_padrao_id?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          cidade_origem_padrao?: string | null;
          cpf?: string | null;
          created_at?: string;
          full_name?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          phone?: string | null;
          ponto_embarque_padrao_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      veiculos: {
        Row: {
          ano: number | null;
          capacidade_vagas: number;
          cnh_foto_url: string | null;
          created_at: string;
          crlv_foto_url: string | null;
          id: string;
          modelo: string;
          motorista_id: string;
          placa: string;
          starlink_wifi_ssid: string | null;
          status_aprovacao: string;
          updated_at: string;
        };
        Insert: {
          ano?: number | null;
          capacidade_vagas?: number;
          cnh_foto_url?: string | null;
          created_at?: string;
          crlv_foto_url?: string | null;
          id?: string;
          modelo: string;
          motorista_id: string;
          placa: string;
          starlink_wifi_ssid?: string | null;
          status_aprovacao?: string;
          updated_at?: string;
        };
        Update: {
          ano?: number | null;
          capacidade_vagas?: number;
          cnh_foto_url?: string | null;
          created_at?: string;
          crlv_foto_url?: string | null;
          id?: string;
          modelo?: string;
          motorista_id?: string;
          placa?: string;
          starlink_wifi_ssid?: string | null;
          status_aprovacao?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      viagens: {
        Row: {
          created_at: string;
          data_viagem: string;
          horario_chegada_previsto: string;
          horario_saida: string;
          id: string;
          linha_id: string;
          motorista_id: string;
          posicao_lat_atual: number | null;
          posicao_lng_atual: number | null;
          status: string;
          ultimo_ponto_passado_id: string | null;
          updated_at: string;
          vagas_ocupadas: number;
          vagas_totais: number;
          veiculo_id: string | null;
        };
        Insert: {
          created_at?: string;
          data_viagem?: string;
          horario_chegada_previsto: string;
          horario_saida: string;
          id?: string;
          linha_id: string;
          motorista_id: string;
          posicao_lat_atual?: number | null;
          posicao_lng_atual?: number | null;
          status?: string;
          ultimo_ponto_passado_id?: string | null;
          updated_at?: string;
          vagas_ocupadas?: number;
          vagas_totais?: number;
          veiculo_id?: string | null;
        };
        Update: {
          created_at?: string;
          data_viagem?: string;
          horario_chegada_previsto?: string;
          horario_saida?: string;
          id?: string;
          linha_id?: string;
          motorista_id?: string;
          posicao_lat_atual?: number | null;
          posicao_lng_atual?: number | null;
          status?: string;
          ultimo_ponto_passado_id?: string | null;
          updated_at?: string;
          vagas_ocupadas?: number;
          vagas_totais?: number;
          veiculo_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "viagens_linha_id_fkey";
            columns: ["linha_id"];
            isOneToOne: false;
            referencedRelation: "linhas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viagens_ultimo_ponto_passado_id_fkey";
            columns: ["ultimo_ponto_passado_id"];
            isOneToOne: false;
            referencedRelation: "pontos_embarque";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "viagens_veiculo_id_fkey";
            columns: ["veiculo_id"];
            isOneToOne: false;
            referencedRelation: "veiculos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      expirar_passagens_pendentes: { Args: never; Returns: number };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "passageiro" | "motorista" | "admin" | "superadmin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["passageiro", "motorista", "admin", "superadmin"],
    },
  },
} as const;
