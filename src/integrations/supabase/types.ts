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
      affinities: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          slug: string
          strength_id: string | null
          updated_at: string
          weakness_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          strength_id?: string | null
          updated_at?: string
          weakness_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
          strength_id?: string | null
          updated_at?: string
          weakness_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affinities_strength_id_fkey"
            columns: ["strength_id"]
            isOneToOne: false
            referencedRelation: "affinities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affinities_weakness_id_fkey"
            columns: ["weakness_id"]
            isOneToOne: false
            referencedRelation: "affinities"
            referencedColumns: ["id"]
          },
        ]
      }
      allegiances: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      archetypes: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      armor_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          set_bonus: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          set_bonus?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          set_bonus?: string | null
          slug?: string
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
      boss_drops: {
        Row: {
          armor_set_id: string | null
          boss_id: string
          drop_rate: string | null
          id: string
          item_id: string | null
          notes: string | null
          sort_order: number
          weapon_id: string | null
        }
        Insert: {
          armor_set_id?: string | null
          boss_id: string
          drop_rate?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          sort_order?: number
          weapon_id?: string | null
        }
        Update: {
          armor_set_id?: string | null
          boss_id?: string
          drop_rate?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          sort_order?: number
          weapon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boss_drops_armor_set_id_fkey"
            columns: ["armor_set_id"]
            isOneToOne: false
            referencedRelation: "armor_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_drops_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_drops_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_drops_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
        ]
      }
      boss_skills: {
        Row: {
          boss_id: string
          cooldown: number | null
          created_at: string
          damage_type: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          skill_type: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          boss_id: string
          cooldown?: number | null
          created_at?: string
          damage_type?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          skill_type?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          boss_id?: string
          cooldown?: number | null
          created_at?: string
          damage_type?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          skill_type?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boss_skills_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
        ]
      }
      boss_strategies: {
        Row: {
          author_id: string | null
          boss_id: string
          content: string | null
          created_at: string
          featured: boolean
          id: string
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          boss_id: string
          content?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          boss_id?: string
          content?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boss_strategies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_strategies_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
        ]
      }
      boss_strategy_heroes: {
        Row: {
          hero_id: string
          id: string
          note: string | null
          sort_order: number
          strategy_id: string
        }
        Insert: {
          hero_id: string
          id?: string
          note?: string | null
          sort_order?: number
          strategy_id: string
        }
        Update: {
          hero_id?: string
          id?: string
          note?: string | null
          sort_order?: number
          strategy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boss_strategy_heroes_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "heroes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_strategy_heroes_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "boss_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      bosses: {
        Row: {
          affinity_id: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          hp: string | null
          id: string
          image_url: string | null
          location: string | null
          lore: string | null
          name: string
          recommended_level: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          affinity_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          hp?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          lore?: string | null
          name: string
          recommended_level?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          affinity_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          hp?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          lore?: string | null
          name?: string
          recommended_level?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bosses_affinity_id_fkey"
            columns: ["affinity_id"]
            isOneToOne: false
            referencedRelation: "affinities"
            referencedColumns: ["id"]
          },
        ]
      }
      factions: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
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
      hero_build_synergies: {
        Row: {
          build_id: string
          hero_id: string
          id: string
          note: string | null
          sort_order: number
        }
        Insert: {
          build_id: string
          hero_id: string
          id?: string
          note?: string | null
          sort_order?: number
        }
        Update: {
          build_id?: string
          hero_id?: string
          id?: string
          note?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "hero_build_synergies_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "hero_builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_build_synergies_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "heroes"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_builds: {
        Row: {
          armor_set_id: string | null
          author_id: string | null
          content: string | null
          created_at: string
          featured: boolean
          hero_id: string
          id: string
          imprint_id: string | null
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
          video_url: string | null
          weapon_id: string | null
        }
        Insert: {
          armor_set_id?: string | null
          author_id?: string | null
          content?: string | null
          created_at?: string
          featured?: boolean
          hero_id: string
          id?: string
          imprint_id?: string | null
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          video_url?: string | null
          weapon_id?: string | null
        }
        Update: {
          armor_set_id?: string | null
          author_id?: string | null
          content?: string | null
          created_at?: string
          featured?: boolean
          hero_id?: string
          id?: string
          imprint_id?: string | null
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string | null
          weapon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hero_builds_armor_set_id_fkey"
            columns: ["armor_set_id"]
            isOneToOne: false
            referencedRelation: "armor_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_builds_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_builds_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "heroes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_builds_imprint_id_fkey"
            columns: ["imprint_id"]
            isOneToOne: false
            referencedRelation: "imprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hero_builds_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_versions: {
        Row: {
          change_source: string
          changed_by: string | null
          created_at: string
          hero_id: string
          id: string
          imprints_snapshot: Json
          skills_snapshot: Json
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_source?: string
          changed_by?: string | null
          created_at?: string
          hero_id: string
          id?: string
          imprints_snapshot?: Json
          skills_snapshot?: Json
          snapshot?: Json
          version_number?: number
        }
        Update: {
          change_source?: string
          changed_by?: string | null
          created_at?: string
          hero_id?: string
          id?: string
          imprints_snapshot?: Json
          skills_snapshot?: Json
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "hero_versions_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "heroes"
            referencedColumns: ["id"]
          },
        ]
      }
      heroes: {
        Row: {
          affinity: string | null
          affinity_id: string | null
          allegiance: string | null
          allegiance_id: string | null
          archetype_id: string | null
          ascension_bonuses: Json | null
          awakening_bonuses: Json | null
          created_at: string
          description: string | null
          divinity_generator: string | null
          faction_id: string | null
          id: string
          image_focal_point: string
          image_focal_x: number
          image_focal_y: number
          image_url: string | null
          image_zoom: number
          leader_bonus: Json | null
          lore: string | null
          name: string
          rarity: number
          slug: string
          stats: Json | null
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          affinity?: string | null
          affinity_id?: string | null
          allegiance?: string | null
          allegiance_id?: string | null
          archetype_id?: string | null
          ascension_bonuses?: Json | null
          awakening_bonuses?: Json | null
          created_at?: string
          description?: string | null
          divinity_generator?: string | null
          faction_id?: string | null
          id?: string
          image_focal_point?: string
          image_focal_x?: number
          image_focal_y?: number
          image_url?: string | null
          image_zoom?: number
          leader_bonus?: Json | null
          lore?: string | null
          name: string
          rarity: number
          slug: string
          stats?: Json | null
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          affinity?: string | null
          affinity_id?: string | null
          allegiance?: string | null
          allegiance_id?: string | null
          archetype_id?: string | null
          ascension_bonuses?: Json | null
          awakening_bonuses?: Json | null
          created_at?: string
          description?: string | null
          divinity_generator?: string | null
          faction_id?: string | null
          id?: string
          image_focal_point?: string
          image_focal_x?: number
          image_focal_y?: number
          image_url?: string | null
          image_zoom?: number
          leader_bonus?: Json | null
          lore?: string | null
          name?: string
          rarity?: number
          slug?: string
          stats?: Json | null
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heroes_affinity_id_fkey"
            columns: ["affinity_id"]
            isOneToOne: false
            referencedRelation: "affinities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heroes_allegiance_id_fkey"
            columns: ["allegiance_id"]
            isOneToOne: false
            referencedRelation: "allegiances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heroes_archetype_id_fkey"
            columns: ["archetype_id"]
            isOneToOne: false
            referencedRelation: "archetypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heroes_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      imprints: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          passive: string | null
          rarity: number
          slug: string
          source_hero_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          passive?: string | null
          rarity?: number
          slug: string
          source_hero_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          passive?: string | null
          rarity?: number
          slug?: string
          source_hero_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imprints_source_hero_id_fkey"
            columns: ["source_hero_id"]
            isOneToOne: false
            referencedRelation: "heroes"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          item_type: string
          name: string
          obtain_method: string | null
          rarity: number
          slug: string
          stats: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_type: string
          name: string
          obtain_method?: string | null
          rarity: number
          slug: string
          stats?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_type?: string
          name?: string
          obtain_method?: string | null
          rarity?: number
          slug?: string
          stats?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      mechanics: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          mechanic_type: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          mechanic_type?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          mechanic_type?: string
          name?: string
          slug?: string
          updated_at?: string
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
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      skills: {
        Row: {
          awakening_bonus: string | null
          awakening_level: number | null
          cooldown: number | null
          created_at: string
          description: string | null
          effects: Json | null
          hero_id: string | null
          id: string
          image_url: string | null
          initial_divinity: number | null
          name: string
          scaling: Json | null
          scaling_formula: string | null
          skill_type: string
          slug: string
          ultimate_cost: number | null
          updated_at: string
        }
        Insert: {
          awakening_bonus?: string | null
          awakening_level?: number | null
          cooldown?: number | null
          created_at?: string
          description?: string | null
          effects?: Json | null
          hero_id?: string | null
          id?: string
          image_url?: string | null
          initial_divinity?: number | null
          name: string
          scaling?: Json | null
          scaling_formula?: string | null
          skill_type?: string
          slug: string
          ultimate_cost?: number | null
          updated_at?: string
        }
        Update: {
          awakening_bonus?: string | null
          awakening_level?: number | null
          cooldown?: number | null
          created_at?: string
          description?: string | null
          effects?: Json | null
          hero_id?: string | null
          id?: string
          image_url?: string | null
          initial_divinity?: number | null
          name?: string
          scaling?: Json | null
          scaling_formula?: string | null
          skill_type?: string
          slug?: string
          ultimate_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "heroes"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_diffs: {
        Row: {
          batch_id: string
          created_at: string
          current_value: string | null
          entity_id: string | null
          entity_type: string
          field: string
          hero_id: string
          hero_name: string
          id: string
          incoming_value: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          current_value?: string | null
          entity_id?: string | null
          entity_type?: string
          field: string
          hero_id: string
          hero_name: string
          id?: string
          incoming_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          current_value?: string | null
          entity_id?: string | null
          entity_type?: string
          field?: string
          hero_id?: string
          hero_name?: string
          id?: string
          incoming_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_diffs_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "heroes"
            referencedColumns: ["id"]
          },
        ]
      }
      team_slots: {
        Row: {
          armor_set_1_id: string | null
          armor_set_2_id: string | null
          armor_set_3_id: string | null
          hero_id: string | null
          id: string
          imprint_id: string | null
          slot_number: number
          team_id: string
          weapon_id: string | null
        }
        Insert: {
          armor_set_1_id?: string | null
          armor_set_2_id?: string | null
          armor_set_3_id?: string | null
          hero_id?: string | null
          id?: string
          imprint_id?: string | null
          slot_number: number
          team_id: string
          weapon_id?: string | null
        }
        Update: {
          armor_set_1_id?: string | null
          armor_set_2_id?: string | null
          armor_set_3_id?: string | null
          hero_id?: string | null
          id?: string
          imprint_id?: string | null
          slot_number?: number
          team_id?: string
          weapon_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_slots_armor_set_1_id_fkey"
            columns: ["armor_set_1_id"]
            isOneToOne: false
            referencedRelation: "armor_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_slots_armor_set_2_id_fkey"
            columns: ["armor_set_2_id"]
            isOneToOne: false
            referencedRelation: "armor_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_slots_armor_set_3_id_fkey"
            columns: ["armor_set_3_id"]
            isOneToOne: false
            referencedRelation: "armor_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_slots_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "heroes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_slots_imprint_id_fkey"
            columns: ["imprint_id"]
            isOneToOne: false
            referencedRelation: "imprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_slots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_slots_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_heroes: {
        Row: {
          created_at: string
          hero_id: string
          id: string
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          hero_id: string
          id?: string
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          hero_id?: string
          id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_heroes_hero_id_fkey"
            columns: ["hero_id"]
            isOneToOne: false
            referencedRelation: "heroes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_imprints: {
        Row: {
          created_at: string
          id: string
          imprint_id: string
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imprint_id: string
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imprint_id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_imprints_imprint_id_fkey"
            columns: ["imprint_id"]
            isOneToOne: false
            referencedRelation: "imprints"
            referencedColumns: ["id"]
          },
        ]
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
      user_weapons: {
        Row: {
          created_at: string
          id: string
          source: string | null
          user_id: string
          weapon_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string | null
          user_id: string
          weapon_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string | null
          user_id?: string
          weapon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_weapons_weapon_id_fkey"
            columns: ["weapon_id"]
            isOneToOne: false
            referencedRelation: "weapons"
            referencedColumns: ["id"]
          },
        ]
      }
      weapons: {
        Row: {
          created_at: string
          faction: string | null
          faction_id: string | null
          id: string
          image_url: string | null
          imprint_id: string | null
          name: string
          passive: string | null
          rank: number
          rarity: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          faction?: string | null
          faction_id?: string | null
          id?: string
          image_url?: string | null
          imprint_id?: string | null
          name: string
          passive?: string | null
          rank?: number
          rarity?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          faction?: string | null
          faction_id?: string | null
          id?: string
          image_url?: string | null
          imprint_id?: string | null
          name?: string
          passive?: string | null
          rank?: number
          rarity?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weapons_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weapons_imprint_id_fkey"
            columns: ["imprint_id"]
            isOneToOne: false
            referencedRelation: "imprints"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
