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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      armor_sets: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          role: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          role?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          role?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      awakenings: {
        Row: {
          awakening_level: number | null
          created_at: string
          effect: string | null
          id: string
          skill_id: string
          updated_at: string
        }
        Insert: {
          awakening_level?: number | null
          created_at?: string
          effect?: string | null
          id?: string
          skill_id: string
          updated_at?: string
        }
        Update: {
          awakening_level?: number | null
          created_at?: string
          effect?: string | null
          id?: string
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_awakenings_skill_id"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      boss_skills: {
        Row: {
          boss_id: string | null
          created_at: string
          created_by: string
          description: string | null
          effects: Json | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          type: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          boss_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          effects?: Json | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          type?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          boss_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          effects?: Json | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          type?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      bosses: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          action: string
          contributor_id: string
          created_at: string
          id: string
          payload: Json
          record_id: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          status: string
          table_name: string
        }
        Insert: {
          action: string
          contributor_id: string
          created_at?: string
          id?: string
          payload?: Json
          record_id?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          status?: string
          table_name: string
        }
        Update: {
          action?: string
          contributor_id?: string
          created_at?: string
          id?: string
          payload?: Json
          record_id?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          status?: string
          table_name?: string
        }
        Relationships: []
      }
      effects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          type: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          type?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          type?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      entity_definitions: {
        Row: {
          created_at: string
          created_by: string
          deployed: boolean
          id: string
          name: string
          public_slug: string | null
          schema: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deployed?: boolean
          id?: string
          name?: string
          public_slug?: string | null
          schema?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deployed?: boolean
          id?: string
          name?: string
          public_slug?: string | null
          schema?: Json
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string | null
          page_url: string
          rating: number
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          page_url: string
          rating: number
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          page_url?: string
          rating?: number
        }
        Relationships: []
      }
      guides: {
        Row: {
          author: string
          category: string
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author: string
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author?: string
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      hunt_paths: {
        Row: {
          affected_stat: string | null
          created_at: string
          effect: string | null
          id: string
          level: number | null
          name: string
          required_trophy_id: string | null
          required_trophy_qty: number | null
          unlock_cost: number | null
          updated_at: string
        }
        Insert: {
          affected_stat?: string | null
          created_at?: string
          effect?: string | null
          id?: string
          level?: number | null
          name: string
          required_trophy_id?: string | null
          required_trophy_qty?: number | null
          unlock_cost?: number | null
          updated_at?: string
        }
        Update: {
          affected_stat?: string | null
          created_at?: string
          effect?: string | null
          id?: string
          level?: number | null
          name?: string
          required_trophy_id?: string | null
          required_trophy_qty?: number | null
          unlock_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_hunt_paths_affected_stat"
            columns: ["affected_stat"]
            isOneToOne: false
            referencedRelation: "stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_hunt_paths_required_trophy_id"
            columns: ["required_trophy_id"]
            isOneToOne: false
            referencedRelation: "trophies"
            referencedColumns: ["id"]
          },
        ]
      }
      hunter_tags: {
        Row: {
          created_at: string
          hunter_id: string
          id: string
          tag_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hunter_id: string
          id?: string
          tag_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hunter_id?: string
          id?: string
          tag_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_hunter_tags_hunter_id"
            columns: ["hunter_id"]
            isOneToOne: false
            referencedRelation: "hunters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_hunter_tags_tag_id"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      hunter_tier_entries: {
        Row: {
          context_id: string
          created_at: string
          criteria_scores: Json
          hunter_id: string
          id: string
          role: string
          tags: string[] | null
          tier: string | null
          tier_override: string | null
          total_score: number
          updated_at: string
        }
        Insert: {
          context_id: string
          created_at?: string
          criteria_scores?: Json
          hunter_id: string
          id?: string
          role?: string
          tags?: string[] | null
          tier?: string | null
          tier_override?: string | null
          total_score?: number
          updated_at?: string
        }
        Update: {
          context_id?: string
          created_at?: string
          criteria_scores?: Json
          hunter_id?: string
          id?: string
          role?: string
          tags?: string[] | null
          tier?: string | null
          tier_override?: string | null
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hunter_tier_entries_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "tier_list_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hunter_tier_entries_hunter_id_fkey"
            columns: ["hunter_id"]
            isOneToOne: false
            referencedRelation: "hunters"
            referencedColumns: ["id"]
          },
        ]
      }
      hunters: {
        Row: {
          attack: number | null
          awakening_level: number | null
          created_at: string
          created_by: string
          defense: number | null
          description: string | null
          health: number | null
          id: string
          image_url: string | null
          level: number | null
          name: string
          power: number | null
          rarity: number | null
          skill_id: string | null
          slug: string
          speed: number | null
          subtitle: string | null
          tags: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          attack?: number | null
          awakening_level?: number | null
          created_at?: string
          created_by: string
          defense?: number | null
          description?: string | null
          health?: number | null
          id?: string
          image_url?: string | null
          level?: number | null
          name: string
          power?: number | null
          rarity?: number | null
          skill_id?: string | null
          slug: string
          speed?: number | null
          subtitle?: string | null
          tags?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          attack?: number | null
          awakening_level?: number | null
          created_at?: string
          created_by?: string
          defense?: number | null
          description?: string | null
          health?: number | null
          id?: string
          image_url?: string | null
          level?: number | null
          name?: string
          power?: number | null
          rarity?: number | null
          skill_id?: string | null
          slug?: string
          speed?: number | null
          subtitle?: string | null
          tags?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          author: string | null
          category: string
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author?: string | null
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author?: string | null
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      news_comments: {
        Row: {
          article_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "news_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      official_posts: {
        Row: {
          author: string
          author_role: string | null
          channel_name: string | null
          content: string
          created_at: string
          discord_message_id: string | null
          id: string
          image_url: string | null
          is_edited: boolean
          message_url: string | null
          posted_at: string
          region: string | null
          source: string
          title: string | null
        }
        Insert: {
          author: string
          author_role?: string | null
          channel_name?: string | null
          content: string
          created_at?: string
          discord_message_id?: string | null
          id?: string
          image_url?: string | null
          is_edited?: boolean
          message_url?: string | null
          posted_at?: string
          region?: string | null
          source?: string
          title?: string | null
        }
        Update: {
          author?: string
          author_role?: string | null
          channel_name?: string | null
          content?: string
          created_at?: string
          discord_message_id?: string | null
          id?: string
          image_url?: string | null
          is_edited?: boolean
          message_url?: string | null
          posted_at?: string
          region?: string | null
          source?: string
          title?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page_url: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_url: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_url?: string
          session_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarding_complete: boolean
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          onboarding_complete?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarding_complete?: boolean
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          sort_order: number
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_templates: {
        Row: {
          created_at: string
          description_template: string | null
          entity_type: string
          id: string
          title_template: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_template?: string | null
          entity_type: string
          id?: string
          title_template?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_template?: string | null
          entity_type?: string
          id?: string
          title_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_changelog: {
        Row: {
          change_type: string
          created_at: string
          description: string
          id: string
          published_at: string
          title: string
          version: string | null
        }
        Insert: {
          change_type?: string
          created_at?: string
          description: string
          id?: string
          published_at?: string
          title: string
          version?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          description?: string
          id?: string
          published_at?: string
          title?: string
          version?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          current_patch: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_patch?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_patch?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          awakening_id: string | null
          cooldown: number | null
          created_at: string
          created_by: string
          description: string | null
          effects: Json | null
          hunter_id: string | null
          icon: string | null
          id: string
          max_level: number | null
          name: string
          slug: string
          sort_order: number | null
          type: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          awakening_id?: string | null
          cooldown?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          effects?: Json | null
          hunter_id?: string | null
          icon?: string | null
          id?: string
          max_level?: number | null
          name: string
          slug: string
          sort_order?: number | null
          type?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          awakening_id?: string | null
          cooldown?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          effects?: Json | null
          hunter_id?: string | null
          icon?: string | null
          id?: string
          max_level?: number | null
          name?: string
          slug?: string
          sort_order?: number | null
          type?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_skills_hunter_id"
            columns: ["hunter_id"]
            isOneToOne: false
            referencedRelation: "hunters"
            referencedColumns: ["id"]
          },
        ]
      }
      stats: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      tier_list_contexts: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tier_list_criteria: {
        Row: {
          created_at: string
          description: string | null
          id: string
          max_score: number
          name: string
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          max_score?: number
          name: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          max_score?: number
          name?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      tier_score_ranges: {
        Row: {
          created_at: string
          id: string
          min_score: number
          sort_order: number
          tier: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_score: number
          sort_order?: number
          tier: string
        }
        Update: {
          created_at?: string
          id?: string
          min_score?: number
          sort_order?: number
          tier?: string
        }
        Relationships: []
      }
      trophies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          rarity: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rarity?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rarity?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "contributor"
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
      app_role: ["admin", "moderator", "user", "contributor"],
    },
  },
} as const
