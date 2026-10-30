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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_badges: {
        Row: {
          awarded_at: string
          id: string
          level: string
          niche: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          id?: string
          level: string
          niche: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          id?: string
          level?: string
          niche?: string
          user_id?: string
        }
        Relationships: []
      }
      academic_fixed_quizzes: {
        Row: {
          created_at: string
          id: string
          niche: string
          order_index: number
          questions: Json
          topic: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          niche: string
          order_index: number
          questions: Json
          topic: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          niche?: string
          order_index?: number
          questions?: Json
          topic?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_fixed_quizzes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "academic_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_quiz_results: {
        Row: {
          correct: number
          created_at: string
          id: string
          score_pct: number
          thread_id: string | null
          topic: string
          total_questions: number
          user_id: string
        }
        Insert: {
          correct: number
          created_at?: string
          id?: string
          score_pct: number
          thread_id?: string | null
          topic?: string
          total_questions: number
          user_id: string
        }
        Update: {
          correct?: number
          created_at?: string
          id?: string
          score_pct?: number
          thread_id?: string | null
          topic?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_quiz_results_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_track_modules: {
        Row: {
          created_at: string
          id: string
          order_index: number
          suggested_command: string | null
          summary: string | null
          title: string
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index: number
          suggested_command?: string | null
          summary?: string | null
          title: string
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          suggested_command?: string | null
          summary?: string | null
          title?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_track_modules_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "academic_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_tracks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          niche: string
          slug: string
          title: string
          total_modules: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          niche: string
          slug: string
          title: string
          total_modules?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          niche?: string
          slug?: string
          title?: string
          total_modules?: number
        }
        Relationships: []
      }
      academic_user_progress: {
        Row: {
          completed_at: string
          id: string
          module_id: string
          track_id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string
          id?: string
          module_id: string
          track_id: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string
          id?: string
          module_id?: string
          track_id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "academic_user_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academic_track_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_user_progress_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "academic_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_xp_log: {
        Row: {
          created_at: string
          id: string
          niche: string | null
          source: string
          source_ref: string | null
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          niche?: string | null
          source: string
          source_ref?: string | null
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          niche?: string | null
          source?: string
          source_ref?: string | null
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      admin_alert_log: {
        Row: {
          channel: string
          created_at: string
          detail: string | null
          event_type: string
          id: string
          payload: Json
          ref: string | null
          status: string
          title: string
        }
        Insert: {
          channel: string
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          payload?: Json
          ref?: string | null
          status: string
          title: string
        }
        Update: {
          channel?: string
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          payload?: Json
          ref?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          citations: Json | null
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          citations?: Json | null
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          citations?: Json | null
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_settings: {
        Row: {
          anonymize_enabled: boolean
          created_at: string
          preferred_niches: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymize_enabled?: boolean
          created_at?: string
          preferred_niches?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymize_enabled?: boolean
          created_at?: string
          preferred_niches?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_threads: {
        Row: {
          archived: boolean
          clinic_id: string | null
          created_at: string
          id: string
          mentor_mode: boolean
          patient_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          clinic_id?: string | null
          created_at?: string
          id?: string
          mentor_mode?: boolean
          patient_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          clinic_id?: string | null
          created_at?: string
          id?: string
          mentor_mode?: boolean
          patient_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_threads_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_threads_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_usage_daily: {
        Row: {
          message_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_admin_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role?: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_decisions: {
        Row: {
          blocked: boolean
          cost: number
          created_at: string
          decision: string
          enforced: boolean
          function_name: string
          id: string
          latency_ms: number
          metadata: Json
          ok: boolean
          path_taken: string
          remaining: number | null
          tier: string | null
          unlimited: boolean
          user_id: string | null
        }
        Insert: {
          blocked?: boolean
          cost?: number
          created_at?: string
          decision: string
          enforced?: boolean
          function_name: string
          id?: string
          latency_ms?: number
          metadata?: Json
          ok: boolean
          path_taken: string
          remaining?: number | null
          tier?: string | null
          unlimited?: boolean
          user_id?: string | null
        }
        Update: {
          blocked?: boolean
          cost?: number
          created_at?: string
          decision?: string
          enforced?: boolean
          function_name?: string
          id?: string
          latency_ms?: number
          metadata?: Json
          ok?: boolean
          path_taken?: string
          remaining?: number | null
          tier?: string | null
          unlimited?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      ai_credit_packages: {
        Row: {
          clinic_id: string | null
          created_at: string
          credits_remaining: number
          credits_total: number
          expires_at: string
          id: string
          package_type: string
          price_paid: number
          remaining_units: number
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          transcriptions_remaining: number
          transcriptions_total: number
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          expires_at?: string
          id?: string
          package_type: string
          price_paid: number
          remaining_units?: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          transcriptions_remaining?: number
          transcriptions_total?: number
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          expires_at?: string
          id?: string
          package_type?: string
          price_paid?: number
          remaining_units?: number
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          transcriptions_remaining?: number
          transcriptions_total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_packages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_quotas: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          included_credits: number
          included_transcriptions: number
          period_end: string
          period_start: string
          rollover_credits: number
          tier: string
          updated_at: string
          used_credits: number
          used_transcriptions: number
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          included_credits?: number
          included_transcriptions?: number
          period_end?: string
          period_start?: string
          rollover_credits?: number
          tier: string
          updated_at?: string
          used_credits?: number
          used_transcriptions?: number
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          included_credits?: number
          included_transcriptions?: number
          period_end?: string
          period_start?: string
          rollover_credits?: number
          tier?: string
          updated_at?: string
          used_credits?: number
          used_transcriptions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_quotas_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_transactions: {
        Row: {
          amount_brl: number
          clinic_id: string | null
          created_at: string
          credits_delta: number
          id: string
          notes: string | null
          product_key: string
          stripe_session_id: string | null
          transaction_type: string
          transcriptions_delta: number
          user_id: string
        }
        Insert: {
          amount_brl?: number
          clinic_id?: string | null
          created_at?: string
          credits_delta?: number
          id?: string
          notes?: string | null
          product_key: string
          stripe_session_id?: string | null
          transaction_type: string
          transcriptions_delta?: number
          user_id: string
        }
        Update: {
          amount_brl?: number
          clinic_id?: string | null
          created_at?: string
          credits_delta?: number
          id?: string
          notes?: string | null
          product_key?: string
          stripe_session_id?: string | null
          transaction_type?: string
          transcriptions_delta?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_usage: {
        Row: {
          accounting_applied: boolean
          bypass_reason: string | null
          clinic_id: string | null
          created_at: string
          credits_used: number
          function_name: string
          id: string
          metadata: Json
          package_debited: number
          transcriptions_used: number
          user_id: string | null
          was_blocked: boolean
          was_bypassed: boolean
        }
        Insert: {
          accounting_applied?: boolean
          bypass_reason?: string | null
          clinic_id?: string | null
          created_at?: string
          credits_used?: number
          function_name: string
          id?: string
          metadata?: Json
          package_debited?: number
          transcriptions_used?: number
          user_id?: string | null
          was_blocked?: boolean
          was_bypassed?: boolean
        }
        Update: {
          accounting_applied?: boolean
          bypass_reason?: string | null
          clinic_id?: string | null
          created_at?: string
          credits_used?: number
          function_name?: string
          id?: string
          metadata?: Json
          package_debited?: number
          transcriptions_used?: number
          user_id?: string | null
          was_blocked?: boolean
          was_bypassed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_response_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          function_name: string
          hit_count: number
          response: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          function_name: string
          hit_count?: number
          response: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          function_name?: string
          hit_count?: number
          response?: Json
        }
        Relationships: []
      }
      ai_token_usage: {
        Row: {
          completion_tokens: number | null
          created_at: string
          fallback_index: number
          function_name: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          prompt_tokens: number | null
          total_tokens: number | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          fallback_index?: number
          function_name: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          prompt_tokens?: number | null
          total_tokens?: number | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          fallback_index?: number
          function_name?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          prompt_tokens?: number | null
          total_tokens?: number | null
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "patient_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_templates: {
        Row: {
          body: string
          category: string
          clinic_id: string | null
          created_at: string
          created_by: string
          cta_label: string | null
          cta_url: string | null
          id: string
          name: string
          professional_id: string | null
          title: string
        }
        Insert: {
          body: string
          category?: string
          clinic_id?: string | null
          created_at?: string
          created_by: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          name: string
          professional_id?: string | null
          title: string
        }
        Update: {
          body?: string
          category?: string
          clinic_id?: string | null
          created_at?: string
          created_by?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          name?: string
          professional_id?: string | null
          title?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          created_at: string
          error_message: string
          error_stack: string | null
          function_name: string | null
          id: string
          metadata: Json
          route: string | null
          scope: string
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_stack?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json
          route?: string | null
          scope?: string
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_stack?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json
          route?: string | null
          scope?: string
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      appointment_requests: {
        Row: {
          appointment_id: string | null
          clinic_id: string | null
          confirmed_date: string | null
          confirmed_time: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          notes: string | null
          patient_email: string | null
          patient_name: string
          patient_phone: string | null
          patient_user_id: string
          professional_id: string | null
          requested_date: string
          requested_period: string | null
          requested_time: string | null
          service_id: string | null
          status: string
        }
        Insert: {
          appointment_id?: string | null
          clinic_id?: string | null
          confirmed_date?: string | null
          confirmed_time?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name: string
          patient_phone?: string | null
          patient_user_id: string
          professional_id?: string | null
          requested_date: string
          requested_period?: string | null
          requested_time?: string | null
          service_id?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string | null
          confirmed_date?: string | null
          confirmed_time?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name?: string
          patient_phone?: string | null
          patient_user_id?: string
          professional_id?: string | null
          requested_date?: string
          requested_period?: string | null
          requested_time?: string | null
          service_id?: string | null
          status?: string
        }
        Relationships: []
      }
      assessment_addenda: {
        Row: {
          assessment_id: string
          author_name: string | null
          author_type: string
          author_user_id: string | null
          considered_at: string | null
          content: string
          created_at: string
          id: string
          status: string
          token: string | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          author_name?: string | null
          author_type?: string
          author_user_id?: string | null
          considered_at?: string | null
          content?: string
          created_at?: string
          id?: string
          status?: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          author_name?: string | null
          author_type?: string
          author_user_id?: string | null
          considered_at?: string | null
          content?: string
          created_at?: string
          id?: string
          status?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_addenda_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_progress: {
        Row: {
          created_at: string
          device_id: string
          device_label: string | null
          expires_at: string
          id: string
          scope_key: string
          snapshot: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_label?: string | null
          expires_at?: string
          id?: string
          scope_key: string
          snapshot: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_label?: string | null
          expires_at?: string
          id?: string
          scope_key?: string
          snapshot?: Json
          updated_at?: string
        }
        Relationships: []
      }
      assessment_voice_notes: {
        Row: {
          assessment_id: string | null
          clinic_id: string | null
          created_at: string
          created_by: string
          duration_seconds: number | null
          error: string | null
          id: string
          language: string | null
          patient_id: string | null
          patient_name: string | null
          professional_id: string | null
          status: string
          summary: Json | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          clinic_id?: string | null
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          error?: string | null
          id?: string
          language?: string | null
          patient_id?: string | null
          patient_name?: string | null
          professional_id?: string | null
          status?: string
          summary?: Json | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          error?: string | null
          id?: string
          language?: string | null
          patient_id?: string | null
          patient_name?: string | null
          professional_id?: string | null
          status?: string
          summary?: Json | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_voice_notes_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_voice_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_voice_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_voice_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_voice_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          anamnesis_data: Json | null
          archived_at: string | null
          clinic_id: string | null
          created_at: string
          diagnosis: Json | null
          external_import_data: Json | null
          final_hypothesis: string | null
          final_hypothesis_at: string | null
          final_hypothesis_by: string | null
          id: string
          import_batch_id: string | null
          needs_reimpression: boolean
          original_assessment_id: string | null
          paid_at: string | null
          pain_extent: number | null
          pain_mechanism: Json | null
          pain_regions: string[] | null
          pain_score: number | null
          patient_email: string | null
          patient_name: string | null
          payment_status: string | null
          pending_upgrade_data: Json | null
          professional_id: string | null
          red_flags: Json | null
          red_flags_dismissed_at: string | null
          red_flags_dismissed_by: string | null
          red_flags_dismissed_by_name: string | null
          red_flags_dismissed_reason: string | null
          redo_used: boolean | null
          reviewed_at: string | null
          status: string
          test_results: Json | null
          treatment_plan: Json | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anamnesis_data?: Json | null
          archived_at?: string | null
          clinic_id?: string | null
          created_at?: string
          diagnosis?: Json | null
          external_import_data?: Json | null
          final_hypothesis?: string | null
          final_hypothesis_at?: string | null
          final_hypothesis_by?: string | null
          id?: string
          import_batch_id?: string | null
          needs_reimpression?: boolean
          original_assessment_id?: string | null
          paid_at?: string | null
          pain_extent?: number | null
          pain_mechanism?: Json | null
          pain_regions?: string[] | null
          pain_score?: number | null
          patient_email?: string | null
          patient_name?: string | null
          payment_status?: string | null
          pending_upgrade_data?: Json | null
          professional_id?: string | null
          red_flags?: Json | null
          red_flags_dismissed_at?: string | null
          red_flags_dismissed_by?: string | null
          red_flags_dismissed_by_name?: string | null
          red_flags_dismissed_reason?: string | null
          redo_used?: boolean | null
          reviewed_at?: string | null
          status?: string
          test_results?: Json | null
          treatment_plan?: Json | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anamnesis_data?: Json | null
          archived_at?: string | null
          clinic_id?: string | null
          created_at?: string
          diagnosis?: Json | null
          external_import_data?: Json | null
          final_hypothesis?: string | null
          final_hypothesis_at?: string | null
          final_hypothesis_by?: string | null
          id?: string
          import_batch_id?: string | null
          needs_reimpression?: boolean
          original_assessment_id?: string | null
          paid_at?: string | null
          pain_extent?: number | null
          pain_mechanism?: Json | null
          pain_regions?: string[] | null
          pain_score?: number | null
          patient_email?: string | null
          patient_name?: string | null
          payment_status?: string | null
          pending_upgrade_data?: Json | null
          professional_id?: string | null
          red_flags?: Json | null
          red_flags_dismissed_at?: string | null
          red_flags_dismissed_by?: string | null
          red_flags_dismissed_by_name?: string | null
          red_flags_dismissed_reason?: string | null
          redo_used?: boolean | null
          reviewed_at?: string | null
          status?: string
          test_results?: Json | null
          treatment_plan?: Json | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_original_assessment_id_fkey"
            columns: ["original_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string
          content_en: string | null
          content_pt: string
          cover_image_url: string | null
          created_at: string | null
          excerpt_en: string | null
          excerpt_pt: string | null
          id: string
          published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title_en: string | null
          title_pt: string
          updated_at: string | null
        }
        Insert: {
          author_name?: string
          content_en?: string | null
          content_pt: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt_en?: string | null
          excerpt_pt?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title_en?: string | null
          title_pt: string
          updated_at?: string | null
        }
        Update: {
          author_name?: string
          content_en?: string | null
          content_pt?: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt_en?: string | null
          excerpt_pt?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title_en?: string | null
          title_pt?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cardio_functional_tests: {
        Row: {
          created_at: string
          created_by: string
          data: Json
          id: string
          notes: string | null
          patient_id: string
          test_date: string
          test_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          notes?: string | null
          patient_id: string
          test_date: string
          test_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          notes?: string | null
          patient_id?: string
          test_date?: string
          test_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      care_services: {
        Row: {
          active: boolean
          billing_type: string
          clinic_id: string | null
          created_at: string
          deduction_pct: number
          id: string
          name: string
          payout_mode: string | null
          payout_value: number | null
          price: number
          professional_id: string | null
          service_type: string | null
        }
        Insert: {
          active?: boolean
          billing_type?: string
          clinic_id?: string | null
          created_at?: string
          deduction_pct?: number
          id?: string
          name: string
          payout_mode?: string | null
          payout_value?: number | null
          price?: number
          professional_id?: string | null
          service_type?: string | null
        }
        Update: {
          active?: boolean
          billing_type?: string
          clinic_id?: string | null
          created_at?: string
          deduction_pct?: number
          id?: string
          name?: string
          payout_mode?: string | null
          payout_value?: number | null
          price?: number
          professional_id?: string | null
          service_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_services_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      clearance_items: {
        Row: {
          created_at: string
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          item_key: string
          label: string
          phase: string
          plan_id: string
          sort_order: number
          status: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          item_key: string
          label: string
          phase?: string
          plan_id: string
          sort_order?: number
          status?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          item_key?: string
          label?: string
          phase?: string
          plan_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clearance_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "periodization_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_addons: {
        Row: {
          addon_type: string
          clinic_id: string
          created_at: string
          current_period_end: string | null
          id: string
          owner_user_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          addon_type: string
          clinic_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          owner_user_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          addon_type?: string
          clinic_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          owner_user_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_addons_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_assessment_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          assessment_id: string | null
          clinic_id: string
          created_at: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          assessment_id?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          assessment_id?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_assessment_logs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_assessment_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_compensation: {
        Row: {
          clinic_id: string
          id: string
          monthly_fixed: number
          professional_id: string
          session_mode: string
          session_value: number
          updated_at: string
        }
        Insert: {
          clinic_id: string
          id?: string
          monthly_fixed?: number
          professional_id: string
          session_mode?: string
          session_value?: number
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          id?: string
          monthly_fixed?: number
          professional_id?: string
          session_mode?: string
          session_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_compensation_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_feedback_surveys: {
        Row: {
          clinic_answers: Json
          clinic_id: string
          created_at: string
          general_observations: string | null
          id: string
          patient_email: string | null
          patient_name: string | null
          professional_answers: Json
          professional_id: string | null
          service_answers: Json
          service_type: string
        }
        Insert: {
          clinic_answers?: Json
          clinic_id: string
          created_at?: string
          general_observations?: string | null
          id?: string
          patient_email?: string | null
          patient_name?: string | null
          professional_answers?: Json
          professional_id?: string | null
          service_answers?: Json
          service_type?: string
        }
        Update: {
          clinic_answers?: Json
          clinic_id?: string
          created_at?: string
          general_observations?: string | null
          id?: string
          patient_email?: string | null
          patient_name?: string | null
          professional_answers?: Json
          professional_id?: string | null
          service_answers?: Json
          service_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_feedback_surveys_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_feedback_surveys_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_feedback_surveys_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_hidden_patients: {
        Row: {
          clinic_id: string
          hidden_at: string
          hidden_by: string | null
          id: string
          patient_email: string
        }
        Insert: {
          clinic_id: string
          hidden_at?: string
          hidden_by?: string | null
          id?: string
          patient_email: string
        }
        Update: {
          clinic_id?: string
          hidden_at?: string
          hidden_by?: string | null
          id?: string
          patient_email?: string
        }
        Relationships: []
      }
      clinic_invitations: {
        Row: {
          clinic_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["clinic_role"]
          token: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["clinic_role"]
          token?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["clinic_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invitations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          accepted_at: string | null
          clinic_id: string
          council_number: string | null
          council_type: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          report_full_name: string | null
          role: Database["public"]["Enums"]["clinic_role"]
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          clinic_id: string
          council_number?: string | null
          council_type?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          report_full_name?: string | null
          role?: Database["public"]["Enums"]["clinic_role"]
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          clinic_id?: string
          council_number?: string | null
          council_type?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          report_full_name?: string | null
          role?: Database["public"]["Enums"]["clinic_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_payout_adjustments: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          month: string
          professional_id: string
        }
        Insert: {
          amount: number
          clinic_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          month: string
          professional_id: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          month?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_payout_adjustments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          brand_color: string | null
          cnpj: string | null
          created_at: string
          default_session_price: number | null
          id: string
          logo_url: string | null
          max_members: number
          monthly_revenue_goal: number | null
          name: string
          operating_hours_end: string | null
          operating_hours_start: string | null
          owner_user_id: string
          phone: string | null
          rooms_count: number | null
          saturday_hours_end: string | null
          saturday_hours_start: string | null
          subscription_status: string
          subscription_stripe_id: string | null
          trial_credits_cap: number
          trial_started_at: string | null
          updated_at: string
          working_days: number[] | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          cnpj?: string | null
          created_at?: string
          default_session_price?: number | null
          id?: string
          logo_url?: string | null
          max_members?: number
          monthly_revenue_goal?: number | null
          name: string
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          owner_user_id: string
          phone?: string | null
          rooms_count?: number | null
          saturday_hours_end?: string | null
          saturday_hours_start?: string | null
          subscription_status?: string
          subscription_stripe_id?: string | null
          trial_credits_cap?: number
          trial_started_at?: string | null
          updated_at?: string
          working_days?: number[] | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          cnpj?: string | null
          created_at?: string
          default_session_price?: number | null
          id?: string
          logo_url?: string | null
          max_members?: number
          monthly_revenue_goal?: number | null
          name?: string
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          owner_user_id?: string
          phone?: string | null
          rooms_count?: number | null
          saturday_hours_end?: string | null
          saturday_hours_start?: string | null
          subscription_status?: string
          subscription_stripe_id?: string | null
          trial_credits_cap?: number
          trial_started_at?: string | null
          updated_at?: string
          working_days?: number[] | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          id: string
          policy_version: string
          scope_ref: string | null
          subject_email: string | null
          subject_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted?: boolean
          id?: string
          policy_version: string
          scope_ref?: string | null
          subject_email?: string | null
          subject_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          id?: string
          policy_version?: string
          scope_ref?: string | null
          subject_email?: string | null
          subject_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          clinic_id: string | null
          created_at: string
          hidden_by_patient: boolean
          hidden_by_professional: boolean
          id: string
          patient_user_id: string
          professional_id: string | null
          recipient_user_id: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          hidden_by_patient?: boolean
          hidden_by_professional?: boolean
          id?: string
          patient_user_id: string
          professional_id?: string | null
          recipient_user_id?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          hidden_by_patient?: boolean
          hidden_by_professional?: boolean
          id?: string
          patient_user_id?: string
          professional_id?: string | null
          recipient_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      data_subject_requests: {
        Row: {
          account_created_at: string | null
          audit: Json
          created_at: string
          details: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          notified_at: string | null
          protocol: string | null
          request_type: string
          requester_account_type: string | null
          requester_email: string | null
          requester_name: string | null
          requester_signup_provider: string | null
          scheduled_purge_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_created_at?: string | null
          audit?: Json
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notified_at?: string | null
          protocol?: string | null
          request_type: string
          requester_account_type?: string | null
          requester_email?: string | null
          requester_name?: string | null
          requester_signup_provider?: string | null
          scheduled_purge_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_created_at?: string | null
          audit?: Json
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notified_at?: string | null
          protocol?: string | null
          request_type?: string
          requester_account_type?: string | null
          requester_email?: string | null
          requester_name?: string | null
          requester_signup_provider?: string | null
          scheduled_purge_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_completions: {
        Row: {
          completed_at: string
          created_at: string
          exercise_item_id: string
          id: string
          program_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          exercise_item_id: string
          id?: string
          program_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          exercise_item_id?: string
          id?: string
          program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_completions_exercise_item_id_fkey"
            columns: ["exercise_item_id"]
            isOneToOne: false
            referencedRelation: "exercise_program_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_completions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "exercise_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          body_region: string
          category: string
          created_at: string
          description_en: string
          description_es: string
          description_pt: string
          difficulty: string
          id: string
          name_en: string
          name_es: string
          name_pt: string
          thumbnail_url: string | null
          video_check_note: string | null
          video_checked_at: string | null
          video_status: string
          video_url: string | null
        }
        Insert: {
          body_region?: string
          category?: string
          created_at?: string
          description_en?: string
          description_es?: string
          description_pt?: string
          difficulty?: string
          id?: string
          name_en?: string
          name_es?: string
          name_pt: string
          thumbnail_url?: string | null
          video_check_note?: string | null
          video_checked_at?: string | null
          video_status?: string
          video_url?: string | null
        }
        Update: {
          body_region?: string
          category?: string
          created_at?: string
          description_en?: string
          description_es?: string
          description_pt?: string
          difficulty?: string
          id?: string
          name_en?: string
          name_es?: string
          name_pt?: string
          thumbnail_url?: string | null
          video_check_note?: string | null
          video_checked_at?: string | null
          video_status?: string
          video_url?: string | null
        }
        Relationships: []
      }
      exercise_program_items: {
        Row: {
          body_region: string | null
          custom_name: string | null
          custom_video_url: string | null
          exercise_id: string | null
          frequency: string
          id: string
          load_kg: number | null
          load_type: string | null
          observations: string | null
          program_id: string
          reps: string
          sets: string
          sort_order: number
        }
        Insert: {
          body_region?: string | null
          custom_name?: string | null
          custom_video_url?: string | null
          exercise_id?: string | null
          frequency?: string
          id?: string
          load_kg?: number | null
          load_type?: string | null
          observations?: string | null
          program_id: string
          reps?: string
          sets?: string
          sort_order?: number
        }
        Update: {
          body_region?: string | null
          custom_name?: string | null
          custom_video_url?: string | null
          exercise_id?: string | null
          frequency?: string
          id?: string
          load_kg?: number | null
          load_type?: string | null
          observations?: string | null
          program_id?: string
          reps?: string
          sets?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_program_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_program_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "exercise_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_programs: {
        Row: {
          assessment_id: string | null
          clinic_id: string | null
          created_at: string
          domain: string
          expires_at: string
          id: string
          notes: string | null
          patient_name: string
          professional_id: string
          token: string
        }
        Insert: {
          assessment_id?: string | null
          clinic_id?: string | null
          created_at?: string
          domain?: string
          expires_at?: string
          id?: string
          notes?: string | null
          patient_name?: string
          professional_id: string
          token?: string
        }
        Update: {
          assessment_id?: string | null
          clinic_id?: string | null
          created_at?: string
          domain?: string
          expires_at?: string
          id?: string
          notes?: string | null
          patient_name?: string
          professional_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_programs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_programs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_programs_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_programs_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_video_audit_runs: {
        Row: {
          broken_count: number
          checked_count: number
          error: string | null
          finished_at: string | null
          fixed_count: number
          id: string
          issues: Json
          mismatch_count: number
          ok_count: number
          source: string
          started_at: string
        }
        Insert: {
          broken_count?: number
          checked_count?: number
          error?: string | null
          finished_at?: string | null
          fixed_count?: number
          id?: string
          issues?: Json
          mismatch_count?: number
          ok_count?: number
          source?: string
          started_at?: string
        }
        Update: {
          broken_count?: number
          checked_count?: number
          error?: string | null
          finished_at?: string | null
          fixed_count?: number
          id?: string
          issues?: Json
          mismatch_count?: number
          ok_count?: number
          source?: string
          started_at?: string
        }
        Relationships: []
      }
      follow_up_emails: {
        Row: {
          assessment_id: string
          created_at: string
          email: string
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          user_id: string
          week_number: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          email: string
          id?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          user_id: string
          week_number: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          email?: string
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_emails_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      form_drafts: {
        Row: {
          created_at: string
          form_key: string
          id: string
          payload: Json
          scope_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          form_key: string
          id?: string
          payload?: Json
          scope_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          form_key?: string
          id?: string
          payload?: Json
          scope_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      granted_premium_users: {
        Row: {
          email: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
        }
        Insert: {
          email: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          email?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      hep_templates: {
        Row: {
          body_region: string
          clinic_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          items: Json
          name: string
          notes: string | null
          professional_id: string | null
          updated_at: string
        }
        Insert: {
          body_region?: string
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          items?: Json
          name: string
          notes?: string | null
          professional_id?: string | null
          updated_at?: string
        }
        Update: {
          body_region?: string
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          items?: Json
          name?: string
          notes?: string | null
          professional_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          clinic_id: string | null
          created_at: string
          expires_undo_at: string
          id: string
          operation_id: string | null
          professional_id: string | null
          request_key: string | null
          source_filename: string
          source_format: string | null
          status: string
          summary: Json
          undone_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          expires_undo_at?: string
          id?: string
          operation_id?: string | null
          professional_id?: string | null
          request_key?: string | null
          source_filename: string
          source_format?: string | null
          status?: string
          summary?: Json
          undone_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          expires_undo_at?: string
          id?: string
          operation_id?: string | null
          professional_id?: string | null
          request_key?: string | null
          source_filename?: string
          source_format?: string | null
          status?: string
          summary?: Json
          undone_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      import_changes: {
        Row: {
          after_data: Json
          batch_id: string
          before_data: Json | null
          created_at: string
          id: number
          record_id: string
          table_name: string
        }
        Insert: {
          after_data: Json
          batch_id: string
          before_data?: Json | null
          created_at?: string
          id?: never
          record_id: string
          table_name: string
        }
        Update: {
          after_data?: Json
          batch_id?: string
          before_data?: Json | null
          created_at?: string
          id?: never
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_changes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_dismissals: {
        Row: {
          created_at: string
          id: string
          insight_key: string
          patient_key: string
          scope_key: string
          scope_wide: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insight_key: string
          patient_key: string
          scope_key: string
          scope_wide?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insight_key?: string
          patient_key?: string
          scope_key?: string
          scope_wide?: boolean
          user_id?: string
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          abstract: string | null
          added_by: string | null
          approved: boolean
          authors: string | null
          created_at: string
          doi: string | null
          embedding: string | null
          id: string
          is_favorite: boolean
          journal: string | null
          key_findings: string | null
          niche_tags: string[]
          pedro_record_id: string | null
          pedro_score: number | null
          pedro_score_reason: string | null
          pedro_score_source: string | null
          pedro_score_status: string
          pedro_score_verified_at: string | null
          pmid: string | null
          source_url: string | null
          study_type: string | null
          title: string
          updated_at: string
          verification_checked_at: string | null
          verification_matched_title: string | null
          verification_reason: string | null
          verification_similarity: number | null
          verification_source: string | null
          verification_status: string
          year: number | null
        }
        Insert: {
          abstract?: string | null
          added_by?: string | null
          approved?: boolean
          authors?: string | null
          created_at?: string
          doi?: string | null
          embedding?: string | null
          id?: string
          is_favorite?: boolean
          journal?: string | null
          key_findings?: string | null
          niche_tags?: string[]
          pedro_record_id?: string | null
          pedro_score?: number | null
          pedro_score_reason?: string | null
          pedro_score_source?: string | null
          pedro_score_status?: string
          pedro_score_verified_at?: string | null
          pmid?: string | null
          source_url?: string | null
          study_type?: string | null
          title: string
          updated_at?: string
          verification_checked_at?: string | null
          verification_matched_title?: string | null
          verification_reason?: string | null
          verification_similarity?: number | null
          verification_source?: string | null
          verification_status?: string
          year?: number | null
        }
        Update: {
          abstract?: string | null
          added_by?: string | null
          approved?: boolean
          authors?: string | null
          created_at?: string
          doi?: string | null
          embedding?: string | null
          id?: string
          is_favorite?: boolean
          journal?: string | null
          key_findings?: string | null
          niche_tags?: string[]
          pedro_record_id?: string | null
          pedro_score?: number | null
          pedro_score_reason?: string | null
          pedro_score_source?: string | null
          pedro_score_status?: string
          pedro_score_verified_at?: string | null
          pmid?: string | null
          source_url?: string | null
          study_type?: string | null
          title?: string
          updated_at?: string
          verification_checked_at?: string | null
          verification_matched_title?: string | null
          verification_reason?: string | null
          verification_similarity?: number | null
          verification_source?: string | null
          verification_status?: string
          year?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          assessments: boolean
          billing: boolean
          care_plan: boolean
          created_at: string
          load_alerts: boolean
          messages: boolean
          my_assessment: boolean
          payments: boolean
          questionnaires: boolean
          red_flags: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          assessments?: boolean
          billing?: boolean
          care_plan?: boolean
          created_at?: string
          load_alerts?: boolean
          messages?: boolean
          my_assessment?: boolean
          payments?: boolean
          questionnaires?: boolean
          red_flags?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          assessments?: boolean
          billing?: boolean
          care_plan?: boolean
          created_at?: string
          load_alerts?: boolean
          messages?: boolean
          my_assessment?: boolean
          payments?: boolean
          questionnaires?: boolean
          red_flags?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pain_diary_entries: {
        Row: {
          assessment_id: string | null
          condition_key: string | null
          created_at: string
          external_import_data: Json | null
          id: string
          import_batch_id: string | null
          logged_at: string
          notes: string | null
          pain_score: number
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          condition_key?: string | null
          created_at?: string
          external_import_data?: Json | null
          id?: string
          import_batch_id?: string | null
          logged_at?: string
          notes?: string | null
          pain_score: number
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          condition_key?: string | null
          created_at?: string
          external_import_data?: Json | null
          id?: string
          import_batch_id?: string | null
          logged_at?: string
          notes?: string | null
          pain_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pain_diary_entries_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_diary_entries_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_map_paths: {
        Row: {
          id: string
          regions: Json
          updated_at: string
          updated_by: string | null
          view_name: string
        }
        Insert: {
          id?: string
          regions: Json
          updated_at?: string
          updated_by?: string | null
          view_name: string
        }
        Update: {
          id?: string
          regions?: Json
          updated_at?: string
          updated_by?: string | null
          view_name?: string
        }
        Relationships: []
      }
      pain_mechanism_screenings: {
        Row: {
          answers: Json
          assessment_id: string
          created_at: string
          created_by: string | null
          csi_band: string | null
          csi_score: number | null
          id: string
          result: Json | null
          source: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          assessment_id: string
          created_at?: string
          created_by?: string | null
          csi_band?: string | null
          csi_score?: number | null
          id?: string
          result?: Json | null
          source?: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          assessment_id?: string
          created_at?: string
          created_by?: string | null
          csi_band?: string | null
          csi_score?: number | null
          id?: string
          result?: Json | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pain_mechanism_screenings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_announcements: {
        Row: {
          archived: boolean
          audience: string
          author_user_id: string
          body: string
          category: string
          clinic_id: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          expires_at: string | null
          id: string
          professional_id: string | null
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          audience?: string
          author_user_id: string
          body: string
          category?: string
          clinic_id?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          expires_at?: string | null
          id?: string
          professional_id?: string | null
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          audience?: string
          author_user_id?: string
          body?: string
          category?: string
          clinic_id?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          expires_at?: string | null
          id?: string
          professional_id?: string | null
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_files: {
        Row: {
          clinic_id: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          id: string
          mime_type: string
          patient_email: string
          patient_name: string | null
          professional_id: string | null
          uploaded_by: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          patient_email: string
          patient_name?: string | null
          professional_id?: string | null
          uploaded_by: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          patient_email?: string
          patient_name?: string | null
          professional_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_files_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_files_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_files_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_health_records: {
        Row: {
          author_name: string | null
          change_summary: string | null
          clinic_id: string | null
          continuous_medications: string | null
          created_at: string
          created_by: string
          health_conditions: string[]
          health_conditions_control: Json | null
          health_conditions_other: string | null
          health_conditions_other_control: string | null
          health_conditions_other_onset: string | null
          id: string
          observations: string | null
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          recorded_at: string
          suggestions: string | null
          updated_at: string
          uses_continuous_medication: string | null
        }
        Insert: {
          author_name?: string | null
          change_summary?: string | null
          clinic_id?: string | null
          continuous_medications?: string | null
          created_at?: string
          created_by?: string
          health_conditions?: string[]
          health_conditions_control?: Json | null
          health_conditions_other?: string | null
          health_conditions_other_control?: string | null
          health_conditions_other_onset?: string | null
          id?: string
          observations?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          recorded_at?: string
          suggestions?: string | null
          updated_at?: string
          uses_continuous_medication?: string | null
        }
        Update: {
          author_name?: string | null
          change_summary?: string | null
          clinic_id?: string | null
          continuous_medications?: string | null
          created_at?: string
          created_by?: string
          health_conditions?: string[]
          health_conditions_control?: Json | null
          health_conditions_other?: string | null
          health_conditions_other_control?: string | null
          health_conditions_other_onset?: string | null
          id?: string
          observations?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          recorded_at?: string
          suggestions?: string | null
          updated_at?: string
          uses_continuous_medication?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_health_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_health_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_photos: {
        Row: {
          category: string
          clinic_id: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          id: string
          mime_type: string
          patient_email: string
          patient_name: string | null
          professional_id: string | null
          uploaded_by: string
        }
        Insert: {
          category?: string
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          patient_email: string
          patient_name?: string | null
          professional_id?: string | null
          uploaded_by: string
        }
        Update: {
          category?: string
          clinic_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          patient_email?: string
          patient_name?: string | null
          professional_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_photos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_photos_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_photos_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          assessment_token: string | null
          birth_date: string | null
          clinic_id: string | null
          cpf: string | null
          created_at: string
          email: string | null
          external_import_data: Json | null
          full_name: string
          id: string
          import_batch_id: string | null
          is_study_case: boolean
          notes: string | null
          occupation: string | null
          phone: string | null
          prescribed_weekly_frequency: number | null
          professional_id: string | null
          referral_source: string | null
          sex: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          assessment_token?: string | null
          birth_date?: string | null
          clinic_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          external_import_data?: Json | null
          full_name: string
          id?: string
          import_batch_id?: string | null
          is_study_case?: boolean
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          prescribed_weekly_frequency?: number | null
          professional_id?: string | null
          referral_source?: string | null
          sex?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          assessment_token?: string | null
          birth_date?: string | null
          clinic_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          external_import_data?: Json | null
          full_name?: string
          id?: string
          import_batch_id?: string | null
          is_study_case?: boolean
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          prescribed_weekly_frequency?: number | null
          professional_id?: string | null
          referral_source?: string | null
          sex?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_questionnaires: {
        Row: {
          answers: Json | null
          assessment_id: string | null
          clinic_id: string | null
          completed_at: string | null
          completed_via: string | null
          created_at: string
          domain: string
          id: string
          patient_id: string | null
          professional_id: string | null
          questionnaire_id: string
          score: Json | null
          share_token: string | null
          status: string
          suggested_reason: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          assessment_id?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          completed_via?: string | null
          created_at?: string
          domain: string
          id?: string
          patient_id?: string | null
          professional_id?: string | null
          questionnaire_id: string
          score?: Json | null
          share_token?: string | null
          status?: string
          suggested_reason?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          assessment_id?: string | null
          clinic_id?: string | null
          completed_at?: string | null
          completed_via?: string | null
          created_at?: string
          domain?: string
          id?: string
          patient_id?: string | null
          professional_id?: string | null
          questionnaire_id?: string
          score?: Json | null
          share_token?: string | null
          status?: string
          suggested_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_questionnaires_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_questionnaires_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_questionnaires_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_questionnaires_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_cycles: {
        Row: {
          created_at: string
          end_date: string | null
          exit_criteria: string | null
          goal: string | null
          id: string
          is_current: boolean
          level: string
          marked_current_at: string | null
          name: string
          parent_id: string | null
          plan_id: string
          sort_order: number
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          exit_criteria?: string | null
          goal?: string | null
          id?: string
          is_current?: boolean
          level: string
          marked_current_at?: string | null
          name: string
          parent_id?: string | null
          plan_id: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          exit_criteria?: string | null
          goal?: string | null
          id?: string
          is_current?: boolean
          level?: string
          marked_current_at?: string | null
          name?: string
          parent_id?: string | null
          plan_id?: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodization_cycles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "periodization_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_cycles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "periodization_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_links: {
        Row: {
          active: boolean
          audience: string
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          last_used_at: string | null
          patient_id: string
          plan_id: string | null
          token: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          last_used_at?: string | null
          patient_id: string
          plan_id?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          last_used_at?: string | null
          patient_id?: string
          plan_id?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodization_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_links_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "periodization_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_plans: {
        Row: {
          assessment_id: string | null
          beta_blocker: boolean
          cardio_profile: string | null
          clinic_id: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          hr_ceiling_override: number | null
          id: string
          injured_limb: string | null
          notes: string | null
          patient_id: string
          professional_id: string | null
          sport: string | null
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          beta_blocker?: boolean
          cardio_profile?: string | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          hr_ceiling_override?: number | null
          id?: string
          injured_limb?: string | null
          notes?: string | null
          patient_id: string
          professional_id?: string | null
          sport?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          beta_blocker?: boolean
          cardio_profile?: string | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          hr_ceiling_override?: number | null
          id?: string
          injured_limb?: string | null
          notes?: string | null
          patient_id?: string
          professional_id?: string | null
          sport?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodization_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_plans_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_plans_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_sessions: {
        Row: {
          created_at: string
          created_source: string
          cycle_id: string | null
          exercise_program_id: string | null
          id: string
          notes: string | null
          patient_id: string | null
          plan_id: string | null
          planned_duration_min: number | null
          planned_load: string
          planned_rpe: number | null
          planned_target_load: number | null
          session_date: string
          title: string | null
          track: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_source?: string
          cycle_id?: string | null
          exercise_program_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          plan_id?: string | null
          planned_duration_min?: number | null
          planned_load?: string
          planned_rpe?: number | null
          planned_target_load?: number | null
          session_date: string
          title?: string | null
          track?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_source?: string
          cycle_id?: string | null
          exercise_program_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          plan_id?: string | null
          planned_duration_min?: number | null
          planned_load?: string
          planned_rpe?: number | null
          planned_target_load?: number | null
          session_date?: string
          title?: string | null
          track?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodization_sessions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "periodization_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_sessions_exercise_program_id_fkey"
            columns: ["exercise_program_id"]
            isOneToOne: false
            referencedRelation: "exercise_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "periodization_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_restrictions: {
        Row: {
          created_at: string
          id: string
          kind: string
          plan_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          plan_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          plan_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_restrictions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "periodization_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      post_op_profiles: {
        Row: {
          created_at: string
          created_by: string
          criteria: Json
          graft_type: string | null
          id: string
          meniscal_repair: boolean
          patient_id: string
          surgeon_restrictions: string | null
          surgery_date: string
          surgery_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          criteria?: Json
          graft_type?: string | null
          id?: string
          meniscal_repair?: boolean
          patient_id: string
          surgeon_restrictions?: string | null
          surgery_date: string
          surgery_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          criteria?: Json
          graft_type?: string | null
          id?: string
          meniscal_repair?: boolean
          patient_id?: string
          surgeon_restrictions?: string | null
          surgery_date?: string
          surgery_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_op_profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_op_profiles: {
        Row: {
          created_at: string
          created_by: string
          criteria: Json
          graft_type: string | null
          id: string
          meniscal_repair: boolean
          patient_id: string
          planned_surgery_date: string | null
          surgeon_restrictions: string | null
          surgery_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          criteria?: Json
          graft_type?: string | null
          id?: string
          meniscal_repair?: boolean
          patient_id: string
          planned_surgery_date?: string | null
          surgeon_restrictions?: string | null
          surgery_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          criteria?: Json
          graft_type?: string | null
          id?: string
          meniscal_repair?: boolean
          patient_id?: string
          planned_surgery_date?: string | null
          surgeon_restrictions?: string | null
          surgery_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_op_profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_addons: {
        Row: {
          addon_type: string
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_type: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_type?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          assessment_id: string | null
          clinic_id: string | null
          created_at: string
          duration_minutes: number
          external_import_data: Json | null
          id: string
          import_batch_id: string | null
          notes: string | null
          patient_email: string | null
          patient_name: string
          professional_id: string | null
          recurrence_rule: Json | null
          series_id: string | null
          service_id: string | null
          service_type: string
          status: string
          status_changed_at: string | null
          type: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          assessment_id?: string | null
          clinic_id?: string | null
          created_at?: string
          duration_minutes?: number
          external_import_data?: Json | null
          id?: string
          import_batch_id?: string | null
          notes?: string | null
          patient_email?: string | null
          patient_name?: string
          professional_id?: string | null
          recurrence_rule?: Json | null
          series_id?: string | null
          service_id?: string | null
          service_type?: string
          status?: string
          status_changed_at?: string | null
          type?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          assessment_id?: string | null
          clinic_id?: string | null
          created_at?: string
          duration_minutes?: number
          external_import_data?: Json | null
          id?: string
          import_batch_id?: string | null
          notes?: string | null
          patient_email?: string | null
          patient_name?: string
          professional_id?: string | null
          recurrence_rule?: Json | null
          series_id?: string | null
          service_id?: string | null
          service_type?: string
          status?: string
          status_changed_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_appointments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_appointments_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "care_services"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_hidden_patients: {
        Row: {
          hidden_at: string
          id: string
          patient_email: string
          professional_id: string
        }
        Insert: {
          hidden_at?: string
          id?: string
          patient_email: string
          professional_id: string
        }
        Update: {
          hidden_at?: string
          id?: string
          patient_email?: string
          professional_id?: string
        }
        Relationships: []
      }
      professional_notes: {
        Row: {
          assessment_id: string
          content: string
          created_at: string
          id: string
          include_in_pdf: boolean
          professional_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          content?: string
          created_at?: string
          id?: string
          include_in_pdf?: boolean
          professional_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          content?: string
          created_at?: string
          id?: string
          include_in_pdf?: boolean
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_notes_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_referrals: {
        Row: {
          assessment_id: string | null
          created_at: string
          id: string
          patient_user_id: string
          professional_id: string
          status: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          patient_user_id: string
          professional_id: string
          status?: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          patient_user_id?: string
          professional_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_referrals_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_referrals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_referrals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          academic_period: number | null
          active: boolean
          active_profile_mode: string
          approved: boolean
          bio: string | null
          city: string
          clinic_address: string | null
          clinic_name: string | null
          cpf: string | null
          created_at: string
          crefito: string | null
          default_session_price: number | null
          email: string | null
          full_name: string
          id: string
          is_partner: boolean
          is_partner_account: boolean
          is_student: boolean
          lifetime_treatment: boolean
          logo_url: string | null
          monthly_revenue_goal: number | null
          phone: string | null
          premium_granted: boolean
          pro_access_expires_at: string | null
          profile_photo_url: string | null
          signature_image_url: string | null
          social_media: string | null
          specialties: string[] | null
          state: string
          student_institution: string | null
          student_name_locked: boolean
          student_period: string | null
          subscription_grace_until: string | null
          subscription_status: string
          subscription_stripe_id: string | null
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_period?: number | null
          active?: boolean
          active_profile_mode?: string
          approved?: boolean
          bio?: string | null
          city: string
          clinic_address?: string | null
          clinic_name?: string | null
          cpf?: string | null
          created_at?: string
          crefito?: string | null
          default_session_price?: number | null
          email?: string | null
          full_name: string
          id?: string
          is_partner?: boolean
          is_partner_account?: boolean
          is_student?: boolean
          lifetime_treatment?: boolean
          logo_url?: string | null
          monthly_revenue_goal?: number | null
          phone?: string | null
          premium_granted?: boolean
          pro_access_expires_at?: string | null
          profile_photo_url?: string | null
          signature_image_url?: string | null
          social_media?: string | null
          specialties?: string[] | null
          state: string
          student_institution?: string | null
          student_name_locked?: boolean
          student_period?: string | null
          subscription_grace_until?: string | null
          subscription_status?: string
          subscription_stripe_id?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_period?: number | null
          active?: boolean
          active_profile_mode?: string
          approved?: boolean
          bio?: string | null
          city?: string
          clinic_address?: string | null
          clinic_name?: string | null
          cpf?: string | null
          created_at?: string
          crefito?: string | null
          default_session_price?: number | null
          email?: string | null
          full_name?: string
          id?: string
          is_partner?: boolean
          is_partner_account?: boolean
          is_student?: boolean
          lifetime_treatment?: boolean
          logo_url?: string | null
          monthly_revenue_goal?: number | null
          phone?: string | null
          premium_granted?: boolean
          pro_access_expires_at?: string | null
          profile_photo_url?: string | null
          signature_image_url?: string | null
          social_media?: string | null
          specialties?: string[] | null
          state?: string
          student_institution?: string | null
          student_name_locked?: boolean
          student_period?: string | null
          subscription_grace_until?: string | null
          subscription_status?: string
          subscription_stripe_id?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          chat_addon_msgs_used: number
          chat_addon_period_end: string | null
          chat_addon_period_start: string | null
          chat_addon_quota: number
          chat_addon_status: string
          chat_addon_stripe_subscription_id: string | null
          created_at: string
          full_name: string | null
          id: string
          occupation: string | null
          preferred_language: string | null
          professional_register_skipped: boolean
          sex: string | null
          signup_origin: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          chat_addon_msgs_used?: number
          chat_addon_period_end?: string | null
          chat_addon_period_start?: string | null
          chat_addon_quota?: number
          chat_addon_status?: string
          chat_addon_stripe_subscription_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          occupation?: string | null
          preferred_language?: string | null
          professional_register_skipped?: boolean
          sex?: string | null
          signup_origin?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          chat_addon_msgs_used?: number
          chat_addon_period_end?: string | null
          chat_addon_period_start?: string | null
          chat_addon_quota?: number
          chat_addon_status?: string
          chat_addon_stripe_subscription_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          occupation?: string | null
          preferred_language?: string | null
          professional_register_skipped?: boolean
          sex?: string | null
          signup_origin?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_delivery_log: {
        Row: {
          category: string | null
          created_at: string
          detail: string | null
          devices: number
          id: string
          kind: string | null
          ref: string | null
          sent: number
          status: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          detail?: string | null
          devices?: number
          id?: string
          kind?: string | null
          ref?: string | null
          sent?: number
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          detail?: string | null
          devices?: number
          id?: string
          kind?: string | null
          ref?: string | null
          sent?: number
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          last_used_at: string | null
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          last_used_at?: string | null
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          last_used_at?: string | null
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      readiness_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          fatigue: number | null
          id: string
          note: string | null
          pain: number | null
          patient_id: string
          peak_hr: number | null
          plan_id: string | null
          readiness: number | null
          resting_hr: number | null
          sleep: number | null
          soreness: number | null
          source: string
          spo2: number | null
          stress: number | null
          updated_at: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          fatigue?: number | null
          id?: string
          note?: string | null
          pain?: number | null
          patient_id: string
          peak_hr?: number | null
          plan_id?: string | null
          readiness?: number | null
          resting_hr?: number | null
          sleep?: number | null
          soreness?: number | null
          source?: string
          spo2?: number | null
          stress?: number | null
          updated_at?: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          fatigue?: number | null
          id?: string
          note?: string | null
          pain?: number | null
          patient_id?: string
          peak_hr?: number | null
          plan_id?: string | null
          readiness?: number | null
          resting_hr?: number | null
          sleep?: number | null
          soreness?: number | null
          source?: string
          spo2?: number | null
          stress?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_checkins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_checkins_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "periodization_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          referral_code_id: string | null
          referred_user_id: string
          referrer_user_id: string
          rewarded_at: string | null
          status: string
          stripe_coupon_id: string | null
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          referral_code_id?: string | null
          referred_user_id: string
          referrer_user_id: string
          rewarded_at?: string | null
          status?: string
          stripe_coupon_id?: string | null
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          referral_code_id?: string | null
          referred_user_id?: string
          referrer_user_id?: string
          rewarded_at?: string | null
          status?: string
          stripe_coupon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          observation: string | null
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          name: string
          observation?: string | null
          owner_user_id?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          observation?: string | null
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          appointment_id: string | null
          clinic_id: string | null
          content: string
          created_at: string
          external_import_data: Json | null
          id: string
          import_batch_id: string | null
          observation: string | null
          patient_email: string
          professional_id: string
          session_date: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          clinic_id?: string | null
          content?: string
          created_at?: string
          external_import_data?: Json | null
          id?: string
          import_batch_id?: string | null
          observation?: string | null
          patient_email: string
          professional_id: string
          session_date?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string | null
          content?: string
          created_at?: string
          external_import_data?: Json | null
          id?: string
          import_batch_id?: string | null
          observation?: string | null
          patient_email?: string
          professional_id?: string
          session_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "professional_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          bucket: string | null
          created_at: string
          created_by: string
          expires_at: string
          file_path: string | null
          id: string
          slug: string
          target_url: string | null
        }
        Insert: {
          bucket?: string | null
          created_at?: string
          created_by: string
          expires_at: string
          file_path?: string | null
          id?: string
          slug: string
          target_url?: string | null
        }
        Update: {
          bucket?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          file_path?: string | null
          id?: string
          slug?: string
          target_url?: string | null
        }
        Relationships: []
      }
      srpe_entries: {
        Row: {
          avg_power_w: number | null
          created_at: string
          distance_km: number | null
          duration_min: number
          hr_avg: number | null
          hr_max: number | null
          hr_recovery_1min: number | null
          id: string
          monitor_source: string | null
          notes: string | null
          patient_id: string
          patient_rpe: number | null
          plan_id: string | null
          rpe: number
          session_date: string
          session_id: string | null
          source: string
          spo2_min: number | null
          track: string
          training_load: number | null
          trimp: number | null
          updated_at: string
          zone_minutes: Json | null
        }
        Insert: {
          avg_power_w?: number | null
          created_at?: string
          distance_km?: number | null
          duration_min: number
          hr_avg?: number | null
          hr_max?: number | null
          hr_recovery_1min?: number | null
          id?: string
          monitor_source?: string | null
          notes?: string | null
          patient_id: string
          patient_rpe?: number | null
          plan_id?: string | null
          rpe: number
          session_date?: string
          session_id?: string | null
          source?: string
          spo2_min?: number | null
          track?: string
          training_load?: number | null
          trimp?: number | null
          updated_at?: string
          zone_minutes?: Json | null
        }
        Update: {
          avg_power_w?: number | null
          created_at?: string
          distance_km?: number | null
          duration_min?: number
          hr_avg?: number | null
          hr_max?: number | null
          hr_recovery_1min?: number | null
          id?: string
          monitor_source?: string | null
          notes?: string | null
          patient_id?: string
          patient_rpe?: number | null
          plan_id?: string | null
          rpe?: number
          session_date?: string
          session_id?: string | null
          source?: string
          spo2_min?: number | null
          track?: string
          training_load?: number | null
          trimp?: number | null
          updated_at?: string
          zone_minutes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "srpe_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "srpe_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "periodization_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "srpe_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "periodization_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_brand_briefs: {
        Row: {
          brand_id: string
          brief: Json
          created_at: string
          id: string
          kit_version: string
          user_id: string
        }
        Insert: {
          brand_id: string
          brief: Json
          created_at?: string
          id?: string
          kit_version: string
          user_id: string
        }
        Update: {
          brand_id?: string
          brief?: Json
          created_at?: string
          id?: string
          kit_version?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_brand_members: {
        Row: {
          brand_id: string
          created_at: string
          email: string
          id: string
          invited_by: string | null
          note: string | null
          revoked_at: string | null
          user_id: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          note?: string | null
          revoked_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          note?: string | null
          revoked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "studio_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_brands: {
        Row: {
          audiences: Json
          brief_answers: Json
          colors: Json
          content_source: string
          created_at: string
          description: string | null
          fonts: Json
          format_insights: string | null
          id: string
          instagram_handle: string | null
          is_active: boolean
          keyword_matrix: Json
          logo_url: string | null
          mark_url: string | null
          name: string
          niche: string | null
          positioning: string | null
          reasoning_matrix: Json
          signature_enabled: boolean
          slogan: string | null
          source_url: string | null
          strategy_notes: string | null
          tone: string | null
          topics: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          audiences?: Json
          brief_answers?: Json
          colors?: Json
          content_source?: string
          created_at?: string
          description?: string | null
          fonts?: Json
          format_insights?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean
          keyword_matrix?: Json
          logo_url?: string | null
          mark_url?: string | null
          name: string
          niche?: string | null
          positioning?: string | null
          reasoning_matrix?: Json
          signature_enabled?: boolean
          slogan?: string | null
          source_url?: string | null
          strategy_notes?: string | null
          tone?: string | null
          topics?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          audiences?: Json
          brief_answers?: Json
          colors?: Json
          content_source?: string
          created_at?: string
          description?: string | null
          fonts?: Json
          format_insights?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean
          keyword_matrix?: Json
          logo_url?: string | null
          mark_url?: string | null
          name?: string
          niche?: string | null
          positioning?: string | null
          reasoning_matrix?: Json
          signature_enabled?: boolean
          slogan?: string | null
          source_url?: string | null
          strategy_notes?: string | null
          tone?: string | null
          topics?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_copy_learning: {
        Row: {
          brand_id: string
          created_at: string
          edited_text: string
          id: string
          original_text: string
          signature: string
          updated_at: string
          user_id: string
          uses: number
        }
        Insert: {
          brand_id: string
          created_at?: string
          edited_text: string
          id?: string
          original_text: string
          signature: string
          updated_at?: string
          user_id: string
          uses?: number
        }
        Update: {
          brand_id?: string
          created_at?: string
          edited_text?: string
          id?: string
          original_text?: string
          signature?: string
          updated_at?: string
          user_id?: string
          uses?: number
        }
        Relationships: []
      }
      studio_creations: {
        Row: {
          angle: string | null
          block_kind: string | null
          brand_id: string | null
          caption: string | null
          composition: Json | null
          created_at: string
          folder: string
          format: string | null
          headline: string | null
          id: string
          is_favorite: boolean
          png_path: string | null
          seed: string
          segment: string | null
          snapshot: Json | null
          text_edits: Json | null
          thumb: string | null
          user_id: string
          watermarked: boolean
        }
        Insert: {
          angle?: string | null
          block_kind?: string | null
          brand_id?: string | null
          caption?: string | null
          composition?: Json | null
          created_at?: string
          folder?: string
          format?: string | null
          headline?: string | null
          id?: string
          is_favorite?: boolean
          png_path?: string | null
          seed: string
          segment?: string | null
          snapshot?: Json | null
          text_edits?: Json | null
          thumb?: string | null
          user_id: string
          watermarked?: boolean
        }
        Update: {
          angle?: string | null
          block_kind?: string | null
          brand_id?: string | null
          caption?: string | null
          composition?: Json | null
          created_at?: string
          folder?: string
          format?: string | null
          headline?: string | null
          id?: string
          is_favorite?: boolean
          png_path?: string | null
          seed?: string
          segment?: string | null
          snapshot?: Json | null
          text_edits?: Json | null
          thumb?: string | null
          user_id?: string
          watermarked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "studio_creations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "studio_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_credits: {
        Row: {
          created_at: string
          extra_credits: number
          free_credits: number
          last_effective_plan: string | null
          period_start: string
          plan: string
          plan_credits: number
          stripe_customer_id: string | null
          subscription_status: string | null
          updated_at: string
          used_this_period: number
          user_id: string
        }
        Insert: {
          created_at?: string
          extra_credits?: number
          free_credits?: number
          last_effective_plan?: string | null
          period_start?: string
          plan?: string
          plan_credits?: number
          stripe_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          used_this_period?: number
          user_id: string
        }
        Update: {
          created_at?: string
          extra_credits?: number
          free_credits?: number
          last_effective_plan?: string | null
          period_start?: string
          plan?: string
          plan_credits?: number
          stripe_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          used_this_period?: number
          user_id?: string
        }
        Relationships: []
      }
      studio_director_runs: {
        Row: {
          ai_on: boolean
          arts: number
          batch_key: string
          brand_id: string
          created_at: string
          distinct_copy: number
          id: string
          learned_applied: number
          repeated_copy: number
          user_id: string
        }
        Insert: {
          ai_on?: boolean
          arts?: number
          batch_key: string
          brand_id: string
          created_at?: string
          distinct_copy?: number
          id?: string
          learned_applied?: number
          repeated_copy?: number
          user_id: string
        }
        Update: {
          ai_on?: boolean
          arts?: number
          batch_key?: string
          brand_id?: string
          created_at?: string
          distinct_copy?: number
          id?: string
          learned_applied?: number
          repeated_copy?: number
          user_id?: string
        }
        Relationships: []
      }
      studio_feed_calendar: {
        Row: {
          brand_id: string
          created_at: string
          creation_id: string | null
          id: string
          kind: string
          notes: string | null
          pillar: string | null
          posted_at: string | null
          scheduled_date: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          creation_id?: string | null
          id?: string
          kind?: string
          notes?: string | null
          pillar?: string | null
          posted_at?: string | null
          scheduled_date?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          creation_id?: string | null
          id?: string
          kind?: string
          notes?: string | null
          pillar?: string | null
          posted_at?: string | null
          scheduled_date?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_feed_calendar_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "studio_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_feed_calendar_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "studio_creations"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_granted_access: {
        Row: {
          created_at: string
          email: string
          granted_by: string | null
          id: string
          note: string | null
          plan: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          granted_by?: string | null
          id?: string
          note?: string | null
          plan?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          plan?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      studio_internal_favorites: {
        Row: {
          favorites: Json
          thumbs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          favorites?: Json
          thumbs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          favorites?: Json
          thumbs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_photos: {
        Row: {
          brand_id: string | null
          created_at: string
          credit: string | null
          description: string | null
          focus_x: number
          focus_y: number
          id: string
          label: string
          owner_id: string
          rotation: number
          safe_area: string
          sort_order: number
          storage_path: string
          updated_at: string
          usage: string
          zoom: number
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          credit?: string | null
          description?: string | null
          focus_x?: number
          focus_y?: number
          id?: string
          label?: string
          owner_id: string
          rotation?: number
          safe_area?: string
          sort_order?: number
          storage_path: string
          updated_at?: string
          usage?: string
          zoom?: number
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          credit?: string | null
          description?: string | null
          focus_x?: number
          focus_y?: number
          id?: string
          label?: string
          owner_id?: string
          rotation?: number
          safe_area?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
          usage?: string
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_photos_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "studio_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_phrase_memory: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          kind: string
          last_used_at: string
          signature: string
          user_id: string
          uses: number
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          kind?: string
          last_used_at?: string
          signature: string
          user_id: string
          uses?: number
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          kind?: string
          last_used_at?: string
          signature?: string
          user_id?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_phrase_memory_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "studio_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_texts: {
        Row: {
          body: string
          brand_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          brand_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          brand_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_texts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "studio_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_admin_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: string | null
          performed_by: string | null
          performed_by_email: string | null
          previous_status: string | null
          professional_id: string | null
          reason: string | null
          stripe_result: Json | null
          stripe_subscription_id: string | null
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          previous_status?: string | null
          professional_id?: string | null
          reason?: string | null
          stripe_result?: Json | null
          stripe_subscription_id?: string | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          previous_status?: string | null
          professional_id?: string | null
          reason?: string | null
          stripe_result?: Json | null
          stripe_subscription_id?: string | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          archived_at: string | null
          created_at: string
          id: string
          message: string
          notified_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          message: string
          notified_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          message?: string
          notified_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets_archive: {
        Row: {
          admin_reply: string | null
          archived_at: string
          archived_by: string
          created_at: string
          id: string
          message: string
          original_ticket_id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          archived_at?: string
          archived_by: string
          created_at: string
          id?: string
          message: string
          original_ticket_id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          archived_at?: string
          archived_by?: string
          created_at?: string
          id?: string
          message?: string
          original_ticket_id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_call_sessions: {
        Row: {
          accepted_at: string | null
          answer_sdp: string | null
          caller_name: string
          caller_user_id: string
          connected_at: string | null
          conversation_id: string
          created_at: string
          ended_at: string | null
          expires_at: string
          failure_reason: string | null
          id: string
          offer_sdp: string | null
          push_devices_found: number
          push_errors: Json
          push_sent: number
          recipient_name: string | null
          recipient_user_id: string
          status: Database["public"]["Enums"]["video_call_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          answer_sdp?: string | null
          caller_name?: string
          caller_user_id: string
          connected_at?: string | null
          conversation_id: string
          created_at?: string
          ended_at?: string | null
          expires_at: string
          failure_reason?: string | null
          id?: string
          offer_sdp?: string | null
          push_devices_found?: number
          push_errors?: Json
          push_sent?: number
          recipient_name?: string | null
          recipient_user_id: string
          status?: Database["public"]["Enums"]["video_call_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          answer_sdp?: string | null
          caller_name?: string
          caller_user_id?: string
          connected_at?: string | null
          conversation_id?: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          failure_reason?: string | null
          id?: string
          offer_sdp?: string | null
          push_devices_found?: number
          push_errors?: Json
          push_sent?: number
          recipient_name?: string | null
          recipient_user_id?: string
          status?: Database["public"]["Enums"]["video_call_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_call_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_users: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      youtube_video_cache: {
        Row: {
          duration_seconds: number | null
          id: string
          query_key: string
          resolved_at: string
          title: string | null
          video_id: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          query_key: string
          resolved_at?: string
          title?: string | null
          video_id: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          query_key?: string
          resolved_at?: string
          title?: string | null
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      professionals_directory: {
        Row: {
          active: boolean | null
          approved: boolean | null
          bio: string | null
          city: string | null
          clinic_address: string | null
          clinic_name: string | null
          crefito: string | null
          full_name: string | null
          id: string | null
          logo_url: string | null
          profile_photo_url: string | null
          social_media: string | null
          specialties: string[] | null
          state: string | null
        }
        Insert: {
          active?: boolean | null
          approved?: boolean | null
          bio?: string | null
          city?: string | null
          clinic_address?: string | null
          clinic_name?: string | null
          crefito?: string | null
          full_name?: string | null
          id?: string | null
          logo_url?: string | null
          profile_photo_url?: string | null
          social_media?: string | null
          specialties?: string[] | null
          state?: string | null
        }
        Update: {
          active?: boolean | null
          approved?: boolean | null
          bio?: string | null
          city?: string | null
          clinic_address?: string | null
          clinic_name?: string | null
          crefito?: string | null
          full_name?: string | null
          id?: string | null
          logo_url?: string | null
          profile_photo_url?: string | null
          social_media?: string | null
          specialties?: string[] | null
          state?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_ai_credit_rollout: {
        Args: { _enabled?: boolean; _tiers?: Json }
        Returns: Json
      }
      admin_delete_professional: {
        Args: { _professional_id: string }
        Returns: undefined
      }
      admin_list_clinics: {
        Args: never
        Returns: {
          active_members: number
          created_at: string
          id: string
          max_members: number
          members: Json
          name: string
          owner_email: string
          owner_name: string
          patients_count: number
          subscription_status: string
          subscription_stripe_id: string
        }[]
      }
      admin_list_patient_users: {
        Args: never
        Returns: {
          basic_count: number
          created_at: string
          email: string
          full_name: string
          granted_premium: boolean
          last_assessment_at: string
          link_source: string
          linked_assessment_count: number
          linked_clinic_names: string[]
          linked_professional_names: string[]
          paid_premium: boolean
          premium_count: number
          signup_origin: string
          user_id: string
        }[]
      }
      admin_purge_user_data:
        | { Args: { _email?: string; _user_id: string }; Returns: Json }
        | {
            Args: { _caller?: string; _email?: string; _user_id: string }
            Returns: Json
          }
      admin_user_data_inventory:
        | { Args: { _email?: string; _user_id: string }; Returns: Json }
        | {
            Args: { _caller?: string; _email?: string; _user_id: string }
            Returns: Json
          }
      ai_credit_grace_ratio: { Args: { _tier: string }; Returns: number }
      announcement_audience_emails: {
        Args: {
          _audience: string
          _clinic_id: string
          _professional_id: string
        }
        Returns: {
          email: string
        }[]
      }
      announcement_recipient_ids: {
        Args: { _announcement_id: string }
        Returns: {
          user_id: string
        }[]
      }
      approve_appointment_request: {
        Args: {
          _date: string
          _duration: number
          _professional_id: string
          _request_id: string
          _service_id: string
          _time: string
        }
        Returns: string
      }
      can_access_assessment_addenda: {
        Args: { _assessment_id: string; _pro_only?: boolean; _user_id: string }
        Returns: boolean
      }
      can_access_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_studio_brand: { Args: { _brand_id: string }; Returns: boolean }
      can_admin_ai_credits: { Args: { _user_id: string }; Returns: boolean }
      can_handle_appointment_request: {
        Args: { _clinic_id: string; _professional_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_clinic: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_hep: {
        Args: { _clinic_id: string; _professional_id: string }
        Returns: boolean
      }
      can_read_exercise_program: {
        Args: { _program_id: string }
        Returns: boolean
      }
      can_use_post_op_beta: { Args: never; Returns: boolean }
      claim_studio_brand_invites: { Args: never; Returns: number }
      clear_assessment_progress: {
        Args: { _scope_key: string }
        Returns: undefined
      }
      clinic_member_credit_weight: {
        Args: { _role: Database["public"]["Enums"]["clinic_role"] }
        Returns: number
      }
      consume_studio_generation: {
        Args: { p_amount?: number }
        Returns: {
          allowance: number
          allowed: boolean
          generations_left: number
          period_start: string
          plan: string
          remaining: number
          unlimited: boolean
          used_this_period: number
        }[]
      }
      consume_studio_generation_for_brand: {
        Args: { p_brand_id: string }
        Returns: {
          allowance: number
          allowed: boolean
          generations_left: number
          period_start: string
          plan: string
          remaining: number
          unlimited: boolean
          used_this_period: number
        }[]
      }
      count_announcement_audience: {
        Args: {
          _audience: string
          _clinic_id: string
          _professional_id: string
        }
        Returns: {
          patients: number
          with_app: number
        }[]
      }
      create_appointment_request: {
        Args: {
          _date: string
          _kind: string
          _notes: string
          _period: string
          _phone: string
          _provider_id: string
          _time: string
        }
        Returns: string
      }
      create_appointment_request_v2: {
        Args: {
          _date: string
          _kind: string
          _provider_id: string
          _service_id: string
          _time: string
        }
        Returns: string
      }
      create_conversation_for_clinic_patient: {
        Args: {
          _clinic_id: string
          _patient_user_id: string
          _professional_id: string
        }
        Returns: string
      }
      create_conversation_for_patient: {
        Args: { _patient_user_id: string; _professional_id: string }
        Returns: string
      }
      create_conversation_for_referral: {
        Args: { _patient_user_id: string; _professional_id: string }
        Returns: string
      }
      create_conversation_with_clinic_staff: {
        Args: { _clinic_id: string }
        Returns: string
      }
      credit_period_start: { Args: never; Returns: string }
      delete_all_my_assessments: { Args: never; Returns: number }
      delete_assessment_secure: {
        Args: { _assessment_id: string }
        Returns: boolean
      }
      delete_my_assessments: { Args: { _ids: string[] }; Returns: number }
      dismiss_appointment_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      dismiss_assessment_red_flags: {
        Args: { _assessment_id: string; _reason: string }
        Returns: undefined
      }
      dsr_append_audit: {
        Args: { _event: Json; _request_id: string }
        Returns: undefined
      }
      ensure_current_credit_quota: {
        Args: { _user_id: string }
        Returns: {
          clinic_id: string | null
          created_at: string
          id: string
          included_credits: number
          included_transcriptions: number
          period_end: string
          period_start: string
          rollover_credits: number
          tier: string
          updated_at: string
          used_credits: number
          used_transcriptions: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_quotas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_studio_credits: {
        Args: never
        Returns: {
          created_at: string
          extra_credits: number
          free_credits: number
          last_effective_plan: string | null
          period_start: string
          plan: string
          plan_credits: number
          stripe_customer_id: string | null
          subscription_status: string | null
          updated_at: string
          used_this_period: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "studio_credits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fulfill_ai_credit_package: {
        Args: {
          _clinic_id: string
          _credits: number
          _key: string
          _payment: string
          _price: number
          _session: string
          _user_id: string
        }
        Returns: boolean
      }
      get_assessment_agenda_conversion: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          assessed_count: number
          attended_count: number
          scheduled_count: number
          unscheduled_count: number
        }[]
      }
      get_assessment_progress: {
        Args: { _scope_key: string }
        Returns: {
          device_id: string
          device_label: string
          snapshot: Json
          updated_at: string
        }[]
      }
      get_assessment_unscheduled_list: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          assessment_date: string
          days_since: number
          identity_key: string
          patient_name: string
        }[]
      }
      get_clinic_all_patients: {
        Args: { _clinic_id: string }
        Returns: {
          email: string
          full_name: string
          has_account: boolean
          user_id: string
        }[]
      }
      get_clinic_benchmarks: {
        Args: { _clinic_id: string }
        Returns: {
          better_when_lower: boolean
          clinic_value: number
          large_avg: number
          large_count: number
          medium_avg: number
          medium_count: number
          metric: string
          peer_avg: number
          peer_count: number
          size_bucket: string
          small_avg: number
          small_count: number
        }[]
      }
      get_clinic_funnel: {
        Args: { _clinic_id: string }
        Returns: {
          assessments_count: number
          engaged_count: number
          inactive_after_treatment: number
          started_count: number
        }[]
      }
      get_clinic_invite_preview: {
        Args: { _token: string }
        Returns: {
          clinic_name: string
          email: string
          expired: boolean
          role: Database["public"]["Enums"]["clinic_role"]
        }[]
      }
      get_clinic_kpis: {
        Args: { _clinic_id: string }
        Returns: {
          assessments_this_month: number
          completed_this_month: number
          monthly_data: Json
          occupancy: number
          status_data: Json
          therapists: number
          today_count: number
          total_this_month: number
        }[]
      }
      get_clinic_members_with_details: {
        Args: { _clinic_id: string }
        Returns: {
          accepted_at: string
          active_profile_mode: string
          email: string
          full_name: string
          has_signature: boolean
          id: string
          is_student: boolean
          role: Database["public"]["Enums"]["clinic_role"]
          status: string
          student_institution: string
          student_period: string
          user_id: string
        }[]
      }
      get_clinic_patient_concentration: {
        Args: { _clinic_id: string }
        Returns: {
          top5_sessions: number
          top5_share_pct: number
          total_patients: number
          total_sessions: number
        }[]
      }
      get_clinic_report_issuer: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: Json
      }
      get_clinic_report_members: { Args: { _clinic_id: string }; Returns: Json }
      get_clinic_role: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["clinic_role"]
      }
      get_clinic_therapist_stats: {
        Args: { _clinic_id: string }
        Returns: {
          active_patients: number
          completed_30d: number
          noshow_rate_30d: number
          professional_id: string
          professional_name: string
        }[]
      }
      get_clinics_public: {
        Args: { _ids: string[] }
        Returns: {
          brand_color: string
          id: string
          logo_url: string
          name: string
          owner_user_id: string
        }[]
      }
      get_discharge_predictions: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          confidence: string
          current_pain: number
          factors: Json
          initial_pain: number
          patient_email: string
          patient_name: string
          professional_id: string
          progress_pct: number
          sessions_done: number
          sessions_remaining: number
          weeks_estimate: number
        }[]
      }
      get_dsr_admin: {
        Args: never
        Returns: {
          account_created_at: string
          account_exists: boolean
          account_type: string
          alerts: Json
          audit: Json
          created_at: string
          details: string
          handled_at: string
          id: string
          notified_at: string
          protocol: string
          request_type: string
          scheduled_purge_at: string
          signup_provider: string
          status: string
          subject_email: string
          subject_name: string
          updated_at: string
          user_id: string
        }[]
      }
      get_exercise_program_by_token: { Args: { _token: string }; Returns: Json }
      get_hep_clinic_branding: { Args: { _token: string }; Returns: Json }
      get_hep_professional: {
        Args: { _token: string }
        Returns: {
          active_profile_mode: string
          clinic_name: string
          full_name: string
          is_student: boolean
          logo_url: string
          student_institution: string
          student_period: string
        }[]
      }
      get_included_credits_for_tier: {
        Args: { _tier: string }
        Returns: number
      }
      get_my_active_exercise_programs: {
        Args: never
        Returns: {
          assessment_id: string
          created_at: string
          expires_at: string
          notes: string
          patient_name: string
          professional_id: string
          professional_name: string
          program_id: string
        }[]
      }
      get_my_announcements: {
        Args: never
        Returns: {
          body: string
          category: string
          cta_label: string
          cta_url: string
          id: string
          is_read: boolean
          provider_logo: string
          provider_name: string
          published_at: string
          title: string
        }[]
      }
      get_my_assessments: {
        Args: never
        Returns: {
          anamnesis_data: Json | null
          archived_at: string | null
          clinic_id: string | null
          created_at: string
          diagnosis: Json | null
          external_import_data: Json | null
          final_hypothesis: string | null
          final_hypothesis_at: string | null
          final_hypothesis_by: string | null
          id: string
          import_batch_id: string | null
          needs_reimpression: boolean
          original_assessment_id: string | null
          paid_at: string | null
          pain_extent: number | null
          pain_mechanism: Json | null
          pain_regions: string[] | null
          pain_score: number | null
          patient_email: string | null
          patient_name: string | null
          payment_status: string | null
          pending_upgrade_data: Json | null
          professional_id: string | null
          red_flags: Json | null
          red_flags_dismissed_at: string | null
          red_flags_dismissed_by: string | null
          red_flags_dismissed_by_name: string | null
          red_flags_dismissed_reason: string | null
          redo_used: boolean | null
          reviewed_at: string | null
          status: string
          test_results: Json | null
          treatment_plan: Json | null
          type: string
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "assessments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_care_providers: {
        Args: never
        Returns: {
          kind: string
          logo_url: string
          name: string
          provider_id: string
        }[]
      }
      get_next_fixed_quiz: {
        Args: { _niche: string; _user_id: string }
        Returns: {
          id: string
          questions: Json
          topic: string
        }[]
      }
      get_patient_adherence_scores: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          attendance_pct: number
          checkin_pct: number
          exercises_pct: number
          patient_email: string
          patient_name: string
          score: number
        }[]
      }
      get_patient_assessment_link_context: {
        Args: { _clinic_id?: string; _professional_id?: string; _token: string }
        Returns: {
          clinic_id: string
          email: string
          full_name: string
          id: string
          professional_id: string
        }[]
      }
      get_patient_churn_risk: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          last_session_date: string
          next_session_date: string
          patient_email: string
          patient_name: string
          professional_id: string
          reasons: Json
          score: number
          silent_days: number
        }[]
      }
      get_patient_load_alerts: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          acute_load: number
          acwr: number
          chronic_load: number
          last_checkin_date: string
          last_srpe_date: string
          level: string
          pain_spike: boolean
          patient_id: string
          patient_name: string
          readiness_baseline: number
          readiness_current: number
          reasons: Json
        }[]
      }
      get_patient_professionals: {
        Args: { _user_id: string }
        Returns: {
          full_name: string
          logo_url: string
          professional_id: string
          professional_user_id: string
        }[]
      }
      get_professional_all_patients: {
        Args: { _professional_id: string }
        Returns: {
          email: string
          full_name: string
          has_account: boolean
          user_id: string
        }[]
      }
      get_professional_patient_contacts: {
        Args: { _professional_id: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_professionals_basic_info: {
        Args: { _professional_ids: string[] }
        Returns: {
          full_name: string
          id: string
          logo_url: string
        }[]
      }
      get_provider_services: {
        Args: { _kind: string; _provider_id: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_public_clinic_assessment_link: {
        Args: { _clinic_id: string }
        Returns: {
          brand_color: string
          has_access: boolean
          id: string
          logo_url: string
          name: string
        }[]
      }
      get_public_professional_assessment_link: {
        Args: { _professional_id: string }
        Returns: {
          active: boolean
          active_profile_mode: string
          approved: boolean
          full_name: string
          has_access: boolean
          id: string
          is_student: boolean
          logo_url: string
          student_institution: string
          student_period: string
          user_id: string
        }[]
      }
      get_reactivation_candidates: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          days_inactive: number
          last_session_date: string
          patient_email: string
          patient_name: string
        }[]
      }
      get_reassessment_due: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          days_since: number
          last_assessment_date: string
          patient_id: string
          patient_name: string
          sessions_since: number
        }[]
      }
      get_steps_phase_overview: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          patient_id: string
          patient_name: string
          phase_goal: string
          phase_name: string
          plan_id: string
          plan_title: string
          sort_order: number
          total_phases: number
          weeks_in_phase: number
        }[]
      }
      get_support_tickets_admin: {
        Args: { _include_archived?: boolean }
        Returns: {
          admin_reply: string
          archived_at: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_ai_tier: { Args: { _user_id: string }; Returns: string }
      get_user_credit_status: { Args: { _user_id: string }; Returns: Json }
      has_active_pro_subscription: {
        Args: { _professional_id: string }
        Returns: boolean
      }
      import_patient_is_unreferenced_shell: {
        Args: { p_id: string }
        Returns: boolean
      }
      import_undo_batches: {
        Args: { p_actor: string; p_batches: string[] }
        Returns: Json
      }
      import_write_record: {
        Args: { p_batch: string; p_data: Json; p_id?: string; p_table: string }
        Returns: string
      }
      is_active_clinic_clinician_anywhere: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_any_clinic_clinician: { Args: { _user_id: string }; Returns: boolean }
      is_clinic_clinician: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinic_finance_manager: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_studio_vip: { Args: never; Returns: boolean }
      match_knowledge_articles: {
        Args: {
          match_count?: number
          min_pedro?: number
          niche_filter?: string[]
          query_embedding: string
        }
        Returns: {
          authors: string
          doi: string
          id: string
          journal: string
          key_findings: string
          pedro_score: number
          similarity: number
          source_url: string
          study_type: string
          title: string
          year: number
        }[]
      }
      purge_expired_clinic_trial: {
        Args: { _clinic_id: string }
        Returns: boolean
      }
      referral_code_exists: { Args: { _code: string }; Returns: boolean }
      renew_clinic_invitation: {
        Args: { _invitation_id: string }
        Returns: string
      }
      renew_my_admin_clinic_trial: { Args: never; Returns: boolean }
      request_assessment_id: { Args: never; Returns: string }
      reset_chat_addon_period_if_needed: {
        Args: { _user_id: string }
        Returns: undefined
      }
      revert_assessment_red_flags_dismissal: {
        Args: { _assessment_id: string }
        Returns: undefined
      }
      save_assessment_progress: {
        Args: {
          _device_id: string
          _device_label?: string
          _scope_key: string
          _snapshot: Json
        }
        Returns: string
      }
      save_clinic_report_identity: {
        Args: {
          _council_number?: string
          _council_type?: string
          _full_name: string
          _member_id: string
        }
        Returns: undefined
      }
      search_marketplace_professionals: {
        Args: { _city?: string; _state?: string }
        Returns: {
          bio: string
          city: string
          clinic_address: string
          clinic_name: string
          crefito: string
          email: string
          full_name: string
          id: string
          phone: string
          profile_photo_url: string
          social_media: string
          specialties: string[]
          state: string
        }[]
      }
      studio_brand_credit_status: {
        Args: { p_brand_id: string }
        Returns: {
          allowance: number
          batch_size: number
          generations_left: number
          period_start: string
          plan: string
          remaining: number
          unlimited: boolean
          used_this_period: number
        }[]
      }
      studio_brand_owner: { Args: { _brand_id: string }; Returns: string }
      studio_brand_photo_limit: {
        Args: { p_brand_id: string }
        Returns: number
      }
      studio_credit_status: {
        Args: never
        Returns: {
          allowance: number
          batch_size: number
          generations_left: number
          period_start: string
          plan: string
          remaining: number
          unlimited: boolean
          used_this_period: number
        }[]
      }
      studio_credit_status_for: {
        Args: { _user: string }
        Returns: {
          allowance: number
          batch_size: number
          generations_left: number
          period_start: string
          plan: string
          remaining: number
          unlimited: boolean
          used_this_period: number
        }[]
      }
      studio_current_email: { Args: never; Returns: string }
      studio_photo_limit_for: { Args: { _user: string }; Returns: number }
      studio_plan_allowance: { Args: { p_plan: string }; Returns: number }
      try_direct_clinic_add: {
        Args: {
          _clinic_id: string
          _email: string
          _invited_by: string
          _role: Database["public"]["Enums"]["clinic_role"]
        }
        Returns: string
      }
      user_has_active_pro_subscription: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      clinic_role:
        | "owner"
        | "therapist"
        | "secretary"
        | "osteopath"
        | "pilates_instructor"
        | "doctor"
        | "rpg_specialist"
        | "massage_therapist"
        | "admin"
        | "intern"
      video_call_status:
        | "ringing"
        | "accepted"
        | "connecting"
        | "connected"
        | "rejected"
        | "missed"
        | "ended"
        | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      clinic_role: [
        "owner",
        "therapist",
        "secretary",
        "osteopath",
        "pilates_instructor",
        "doctor",
        "rpg_specialist",
        "massage_therapist",
        "admin",
        "intern",
      ],
      video_call_status: [
        "ringing",
        "accepted",
        "connecting",
        "connected",
        "rejected",
        "missed",
        "ended",
        "failed",
      ],
    },
  },
} as const
