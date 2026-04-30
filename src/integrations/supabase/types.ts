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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      atividades: {
        Row: {
          criado_em: string
          descricao: string
          id: string
          lead_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          descricao?: string
          id?: string
          lead_id: string
          tipo: string
          user_id: string
        }
        Update: {
          criado_em?: string
          descricao?: string
          id?: string
          lead_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_leads: {
        Row: {
          campanha_id: string
          enviado_em: string | null
          id: string
          lead_id: string
          proximo_envio: string | null
          status_step: string
          step_atual: number
        }
        Insert: {
          campanha_id: string
          enviado_em?: string | null
          id?: string
          lead_id: string
          proximo_envio?: string | null
          status_step?: string
          step_atual?: number
        }
        Update: {
          campanha_id?: string
          enviado_em?: string | null
          id?: string
          lead_id?: string
          proximo_envio?: string | null
          status_step?: string
          step_atual?: number
        }
        Relationships: [
          {
            foreignKeyName: "campanha_leads_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          agendado_para: string | null
          assunto: string
          corpo: string
          criado_em: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["campanha_status"]
          user_id: string
        }
        Insert: {
          agendado_para?: string | null
          assunto?: string
          corpo?: string
          criado_em?: string
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["campanha_status"]
          user_id: string
        }
        Update: {
          agendado_para?: string | null
          assunto?: string
          corpo?: string
          criado_em?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["campanha_status"]
          user_id?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          apollo_key: string | null
          atualizado_em: string
          id: string
          remetente_email: string | null
          remetente_nome: string | null
          sendgrid_key: string | null
          user_id: string
        }
        Insert: {
          apollo_key?: string | null
          atualizado_em?: string
          id?: string
          remetente_email?: string | null
          remetente_nome?: string | null
          sendgrid_key?: string | null
          user_id: string
        }
        Update: {
          apollo_key?: string | null
          atualizado_em?: string
          id?: string
          remetente_email?: string | null
          remetente_nome?: string | null
          sendgrid_key?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_eventos: {
        Row: {
          campanha_lead_id: string
          criado_em: string
          id: string
          ip: string | null
          tipo: string
          user_agent: string | null
        }
        Insert: {
          campanha_lead_id: string
          criado_em?: string
          id?: string
          ip?: string | null
          tipo: string
          user_agent?: string | null
        }
        Update: {
          campanha_lead_id?: string
          criado_em?: string
          id?: string
          ip?: string | null
          tipo?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_eventos_campanha_lead_id_fkey"
            columns: ["campanha_lead_id"]
            isOneToOne: false
            referencedRelation: "campanha_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_steps: {
        Row: {
          assunto: string
          campanha_id: string
          corpo: string
          criado_em: string
          delay_dias: number
          id: string
          step_numero: number
        }
        Insert: {
          assunto?: string
          campanha_id: string
          corpo?: string
          criado_em?: string
          delay_dias?: number
          id?: string
          step_numero: number
        }
        Update: {
          assunto?: string
          campanha_id?: string
          corpo?: string
          criado_em?: string
          delay_dias?: number
          id?: string
          step_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_steps_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          abordagem_sugerida: string | null
          apollo_id: string | null
          atualizado_em: string
          cargo: string | null
          cidade: string | null
          criado_em: string
          email: string | null
          email_status: string | null
          empresa: string | null
          fonte: string | null
          id: string
          linkedin_url: string | null
          nome: string
          score: number | null
          senioridade: string | null
          setor: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          ultima_atividade: string | null
          user_id: string
        }
        Insert: {
          abordagem_sugerida?: string | null
          apollo_id?: string | null
          atualizado_em?: string
          cargo?: string | null
          cidade?: string | null
          criado_em?: string
          email?: string | null
          email_status?: string | null
          empresa?: string | null
          fonte?: string | null
          id?: string
          linkedin_url?: string | null
          nome: string
          score?: number | null
          senioridade?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          ultima_atividade?: string | null
          user_id: string
        }
        Update: {
          abordagem_sugerida?: string | null
          apollo_id?: string | null
          atualizado_em?: string
          cargo?: string | null
          cidade?: string | null
          criado_em?: string
          email?: string | null
          email_status?: string | null
          empresa?: string | null
          fonte?: string | null
          id?: string
          linkedin_url?: string | null
          nome?: string
          score?: number | null
          senioridade?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          ultima_atividade?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notas: {
        Row: {
          criado_em: string
          id: string
          lead_id: string
          texto: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          lead_id: string
          texto: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          lead_id?: string
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas: {
        Row: {
          campanha_id: string | null
          classificacao_ia: string | null
          corpo_resposta: string
          id: string
          lead_id: string
          recebido_em: string
          respondido_em: string | null
          status: string
        }
        Insert: {
          campanha_id?: string | null
          classificacao_ia?: string | null
          corpo_resposta: string
          id?: string
          lead_id: string
          recebido_em?: string
          respondido_em?: string | null
          status?: string
        }
        Update: {
          campanha_id?: string | null
          classificacao_ia?: string | null
          corpo_resposta?: string
          id?: string
          lead_id?: string
          recebido_em?: string
          respondido_em?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          cor: string
          criado_em: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          cor?: string
          criado_em?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          cor?: string
          criado_em?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          assunto: string
          corpo: string
          criado_em: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          assunto?: string
          corpo?: string
          criado_em?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          assunto?: string
          corpo?: string
          criado_em?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      campanha_status: "rascunho" | "enviando" | "enviado" | "agendada"
      lead_status:
        | "novo"
        | "em_contato"
        | "respondeu"
        | "descartado"
        | "convertido"
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
      campanha_status: ["rascunho", "enviando", "enviado", "agendada"],
      lead_status: [
        "novo",
        "em_contato",
        "respondeu",
        "descartado",
        "convertido",
      ],
    },
  },
} as const
