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
      assessments: {
        Row: {
          anamnesis_data: Json | null
          created_at: string
          diagnosis: Json | null
          id: string
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
          redo_used: boolean | null
          status: string
          test_results: Json | null
          treatment_plan: Json | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anamnesis_data?: Json | null
          created_at?: string
          diagnosis?: Json | null
          id?: string
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
          redo_used?: boolean | null
          status?: string
          test_results?: Json | null
          treatment_plan?: Json | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anamnesis_data?: Json | null
          created_at?: string
          diagnosis?: Json | null
          id?: string
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
          redo_used?: boolean | null
          status?: string
          test_results?: Json | null
          treatment_plan?: Json | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
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
      conversations: {
        Row: {
          created_at: string
          hidden_by_patient: boolean
          hidden_by_professional: boolean
          id: string
          patient_user_id: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hidden_by_patient?: boolean
          hidden_by_professional?: boolean
          id?: string
          patient_user_id: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hidden_by_patient?: boolean
          hidden_by_professional?: boolean
          id?: string
          patient_user_id?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
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
          id: string
          logged_at: string
          notes: string | null
          pain_score: number
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          pain_score: number
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          id?: string
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
      professional_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          assessment_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_email: string | null
          patient_name: string
          professional_id: string
          status: string
          type: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          assessment_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name?: string
          professional_id: string
          status?: string
          type?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          assessment_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name?: string
          professional_id?: string
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
            foreignKeyName: "professional_appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
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
        ]
      }
      professionals: {
        Row: {
          active: boolean
          approved: boolean
          bio: string | null
          city: string
          clinic_address: string | null
          clinic_name: string | null
          created_at: string
          crefito: string
          email: string | null
          full_name: string
          id: string
          is_partner: boolean
          lifetime_treatment: boolean
          logo_url: string | null
          phone: string | null
          pro_access_expires_at: string | null
          profile_photo_url: string | null
          social_media: string | null
          specialties: string[] | null
          state: string
          subscription_status: string
          subscription_stripe_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          approved?: boolean
          bio?: string | null
          city: string
          clinic_address?: string | null
          clinic_name?: string | null
          created_at?: string
          crefito: string
          email?: string | null
          full_name: string
          id?: string
          is_partner?: boolean
          lifetime_treatment?: boolean
          logo_url?: string | null
          phone?: string | null
          pro_access_expires_at?: string | null
          profile_photo_url?: string | null
          social_media?: string | null
          specialties?: string[] | null
          state: string
          subscription_status?: string
          subscription_stripe_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          approved?: boolean
          bio?: string | null
          city?: string
          clinic_address?: string | null
          clinic_name?: string | null
          created_at?: string
          crefito?: string
          email?: string | null
          full_name?: string
          id?: string
          is_partner?: boolean
          lifetime_treatment?: boolean
          logo_url?: string | null
          phone?: string | null
          pro_access_expires_at?: string | null
          profile_photo_url?: string | null
          social_media?: string | null
          specialties?: string[] | null
          state?: string
          subscription_status?: string
          subscription_stripe_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          full_name: string | null
          id: string
          occupation: string | null
          preferred_language: string | null
          sex: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          occupation?: string | null
          preferred_language?: string | null
          sex?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          occupation?: string | null
          preferred_language?: string | null
          sex?: string | null
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
          content: string
          created_at: string
          id: string
          patient_email: string
          professional_id: string
          session_date: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          content?: string
          created_at?: string
          id?: string
          patient_email: string
          professional_id: string
          session_date?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          content?: string
          created_at?: string
          id?: string
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
            foreignKeyName: "session_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_conversation_for_referral: {
        Args: { _patient_user_id: string; _professional_id: string }
        Returns: string
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
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
