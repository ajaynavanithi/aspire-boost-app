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
      interview_questions: {
        Row: {
          category: Database["public"]["Enums"]["question_category"]
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          job_role: string
          question: string
          resume_id: string
          suggested_answer: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["question_category"]
          created_at?: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id?: string
          job_role: string
          question: string
          resume_id: string
          suggested_answer?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["question_category"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          id?: string
          job_role?: string
          question?: string
          resume_id?: string
          suggested_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_recommendations: {
        Row: {
          apply_url: string | null
          company_type: string | null
          created_at: string
          id: string
          job_description: string | null
          job_title: string
          match_percentage: number | null
          matched_skills: Json | null
          required_skills: Json | null
          resume_id: string
          salary_range: string | null
          user_id: string
        }
        Insert: {
          apply_url?: string | null
          company_type?: string | null
          created_at?: string
          id?: string
          job_description?: string | null
          job_title: string
          match_percentage?: number | null
          matched_skills?: Json | null
          required_skills?: Json | null
          resume_id: string
          salary_range?: string | null
          user_id: string
        }
        Update: {
          apply_url?: string | null
          company_type?: string | null
          created_at?: string
          id?: string
          job_description?: string | null
          job_title?: string
          match_percentage?: number | null
          matched_skills?: Json | null
          required_skills?: Json | null
          resume_id?: string
          salary_range?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_recommendations_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_analysis: {
        Row: {
          ats_score: number | null
          certifications: Json | null
          created_at: string
          education: Json | null
          experience: Json | null
          extracted_skills: Json | null
          id: string
          improvement_tips: Json | null
          missing_keywords: Json | null
          projects: Json | null
          resume_id: string
          strengths: Json | null
          user_id: string
          weaknesses: Json | null
        }
        Insert: {
          ats_score?: number | null
          certifications?: Json | null
          created_at?: string
          education?: Json | null
          experience?: Json | null
          extracted_skills?: Json | null
          id?: string
          improvement_tips?: Json | null
          missing_keywords?: Json | null
          projects?: Json | null
          resume_id: string
          strengths?: Json | null
          user_id: string
          weaknesses?: Json | null
        }
        Update: {
          ats_score?: number | null
          certifications?: Json | null
          created_at?: string
          education?: Json | null
          experience?: Json | null
          extracted_skills?: Json | null
          id?: string
          improvement_tips?: Json | null
          missing_keywords?: Json | null
          projects?: Json | null
          resume_id?: string
          strengths?: Json | null
          user_id?: string
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_analysis_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          raw_text: string | null
          status: Database["public"]["Enums"]["analysis_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          raw_text?: string | null
          status?: Database["public"]["Enums"]["analysis_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          raw_text?: string | null
          status?: Database["public"]["Enums"]["analysis_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_gaps: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"]
          created_at: string
          id: string
          importance: string | null
          learning_resources: Json | null
          resume_id: string
          skill_name: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          id?: string
          importance?: string | null
          learning_resources?: Json | null
          resume_id: string
          skill_name: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          id?: string
          importance?: string | null
          learning_resources?: Json | null
          resume_id?: string
          skill_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_gaps_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      analysis_status: "pending" | "processing" | "completed" | "failed"
      question_category: "technical" | "hr" | "coding_scenario"
      question_difficulty: "beginner" | "intermediate" | "advanced"
      skill_category: "technical" | "soft_skills" | "tools_frameworks"
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
      analysis_status: ["pending", "processing", "completed", "failed"],
      question_category: ["technical", "hr", "coding_scenario"],
      question_difficulty: ["beginner", "intermediate", "advanced"],
      skill_category: ["technical", "soft_skills", "tools_frameworks"],
    },
  },
} as const
