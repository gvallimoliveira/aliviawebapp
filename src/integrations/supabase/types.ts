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
          bypass_reason: string | null
          created_at: string
          credits_used: number
          function_name: string
          id: string
          metadata: Json
          transcriptions_used: number
          user_id: string | null
          was_blocked: boolean
          was_bypassed: boolean
        }
        Insert: {
          bypass_reason?: string | null
          created_at?: string
          credits_used?: number
          function_name: string
          id?: string
          metadata?: Json
          transcriptions_used?: number
          user_id?: string | null
          was_blocked?: boolean
          was_bypassed?: boolean
        }
        Update: {
          bypass_reason?: string | null
          created_at?: string
          credits_used?: number
          function_name?: string
          id?: string
          metadata?: Json
          transcriptions_used?: number
          user_id?: string | null
          was_blocked?: boolean
          was_bypassed?: boolean
        }
        Relationships: []
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
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["clinic_role"]
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["clinic_role"]
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
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
          saturday_hours_end: string | null
          saturday_hours_start: string | null
          subscription_status: string
          subscription_stripe_id: string | null
          trial_credits_cap: number
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
          saturday_hours_end?: string | null
          saturday_hours_start?: string | null
          subscription_status?: string
          subscription_stripe_id?: string | null
          trial_credits_cap?: number
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
          saturday_hours_end?: string | null
          saturday_hours_start?: string | null
          subscription_status?: string
          subscription_stripe_id?: string | null
          trial_credits_cap?: number
          updated_at?: string
          working_days?: number[] | null
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
          video_url?: string | null
        }
        Relationships: []
      }
      exercise_program_items: {
        Row: {
          custom_name: string | null
          custom_video_url: string | null
          exercise_id: string | null
          frequency: string
          id: string
          observations: string | null
          program_id: string
          reps: string
          sets: string
          sort_order: number
        }
        Insert: {
          custom_name?: string | null
          custom_video_url?: string | null
          exercise_id?: string | null
          frequency?: string
          id?: string
          observations?: string | null
          program_id: string
          reps?: string
          sets?: string
          sort_order?: number
        }
        Update: {
          custom_name?: string | null
          custom_video_url?: string | null
          exercise_id?: string | null
          frequency?: string
          id?: string
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
          created_at: string
          expires_at: string
          id: string
          notes: string | null
          patient_name: string
          professional_id: string
          token: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          patient_name?: string
          professional_id: string
          token?: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
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
          professional_id: string | null
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
          professional_id?: string | null
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
          professional_id?: string | null
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
      pain_diary_entries: {
        Row: {
          assessment_id: string | null
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
          professional_id: string | null
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
          professional_id?: string | null
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
          professional_id?: string | null
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
          service_type: string
          status: string
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
          service_type?: string
          status?: string
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
          service_type?: string
          status?: string
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
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
      session_notes: {
        Row: {
          appointment_id: string | null
          clinic_id: string | null
          content: string
          created_at: string
          external_import_data: Json | null
          id: string
          import_batch_id: string | null
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
      support_tickets: {
        Row: {
          admin_reply: string | null
          archived_at: string | null
          created_at: string
          id: string
          message: string
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
      admin_delete_professional: {
        Args: { _professional_id: string }
        Returns: undefined
      }
      can_manage_clinic: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
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
      dismiss_assessment_red_flags: {
        Args: { _assessment_id: string; _reason: string }
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
          id: string
          is_student: boolean
          role: Database["public"]["Enums"]["clinic_role"]
          status: string
          student_institution: string
          student_period: string
          user_id: string
        }[]
      }
      get_clinic_role: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["clinic_role"]
      }
      get_discharge_predictions: {
        Args: { _clinic_id?: string; _professional_id?: string }
        Returns: {
          confidence: string
          current_pain: number
          initial_pain: number
          patient_email: string
          patient_name: string
          professional_id: string
          sessions_done: number
          sessions_remaining: number
          weeks_estimate: number
        }[]
      }
      get_included_credits_for_tier: {
        Args: { _tier: string }
        Returns: number
      }
      get_my_active_exercise_programs: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          notes: string
          patient_name: string
          professional_id: string
          professional_name: string
          program_id: string
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
      get_next_fixed_quiz: {
        Args: { _niche: string; _user_id: string }
        Returns: {
          id: string
          questions: Json
          topic: string
        }[]
      }
      get_patient_adherence_scores: {
        Args: { _clinic_id: string }
        Returns: {
          attendance_pct: number
          diary_pct: number
          exercises_pct: number
          messages_pct: number
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
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
      reset_chat_addon_period_if_needed: {
        Args: { _user_id: string }
        Returns: undefined
      }
      revert_assessment_red_flags_dismissal: {
        Args: { _assessment_id: string }
        Returns: undefined
      }
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
    },
  },
} as const
