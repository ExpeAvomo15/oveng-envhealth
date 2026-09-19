/**
 * Tipos del esquema `public` de Supabase.
 *
 * ## Cómo regenerarlos
 *
 * Escritos a mano para que F0.3 no dependa de tener el CLI configurado, pero la
 * fuente de verdad es la base de datos. Tras cada migración, regenerarlos:
 *
 * ```bash
 * npx supabase login
 * npx supabase gen types typescript \
 *   --project-id <PROJECT_REF> --schema public > src/lib/database.types.ts
 * ```
 *
 * `<PROJECT_REF>` es el identificador del proyecto (Supabase → Project Settings
 * → General, o el subdominio de la URL: `https://<PROJECT_REF>.supabase.co`).
 *
 * El archivo generado sobrescribe este comentario: es lo esperado. Si el
 * resultado difiere de lo que hay aquí, manda el generado.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          location: string | null;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          location?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          location?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        // La FK de `id` apunta a `auth.users`, fuera del esquema expuesto.
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          content: string;
          image_url: string | null;
          hashtags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          content: string;
          image_url?: string | null;
          hashtags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          content?: string;
          image_url?: string | null;
          hashtags?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_following_id_fkey';
            columns: ['following_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      entities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          type: Database['public']['Enums']['entity_type'];
          category: Database['public']['Enums']['environmental_category'];
          description: string | null;
          location_name: string | null;
          country: string | null;
          lat: number | null;
          lng: number | null;
          cover_image_url: string | null;
          website: string | null;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          type: Database['public']['Enums']['entity_type'];
          category: Database['public']['Enums']['environmental_category'];
          description?: string | null;
          location_name?: string | null;
          country?: string | null;
          lat?: number | null;
          lng?: number | null;
          cover_image_url?: string | null;
          website?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          type?: Database['public']['Enums']['entity_type'];
          category?: Database['public']['Enums']['environmental_category'];
          description?: string | null;
          location_name?: string | null;
          country?: string | null;
          lat?: number | null;
          lng?: number | null;
          cover_image_url?: string | null;
          website?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      entity_metrics: {
        Row: {
          entity_id: string;
          metric: Database['public']['Enums']['entity_metric'];
          value: number;
          unit: string | null;
          label: string | null;
          updated_at: string;
        };
        Insert: {
          entity_id: string;
          metric: Database['public']['Enums']['entity_metric'];
          value: number;
          unit?: string | null;
          label?: string | null;
          updated_at?: string;
        };
        Update: {
          entity_id?: string;
          metric?: Database['public']['Enums']['entity_metric'];
          value?: number;
          unit?: string | null;
          label?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entity_metrics_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'entities';
            referencedColumns: ['id'];
          },
        ];
      };
      entity_ratings: {
        Row: {
          entity_id: string;
          user_id: string;
          score: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          entity_id: string;
          user_id: string;
          score: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          entity_id?: string;
          user_id?: string;
          score?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entity_ratings_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'entities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entity_ratings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      likes: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'likes_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      entity_rating_summary: {
        Row: {
          entity_id: string | null;
          average: number | null;
          ratings_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'entity_ratings_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'entities';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: { [_ in never]: never };
    Enums: {
      entity_type: 'lugar' | 'empresa' | 'iniciativa';
      environmental_category: 'aire' | 'agua' | 'suelo' | 'biodiversidad' | 'energia' | 'residuos';
      entity_metric:
        | 'aire'
        | 'agua'
        | 'suelo'
        | 'biodiversidad'
        | 'cobertura_forestal'
        | 'temperatura_media'
        | 'calidad_general';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

/** Atajos de uso: `Tables<'posts'>` en vez de escribir la ruta completa. */
type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];

export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

/** Alias de dominio, en la terminología del producto. */
export type Profile = Tables<'profiles'>;
export type Post = Tables<'posts'>;
export type Follow = Tables<'follows'>;
export type Like = Tables<'likes'>;
export type Entity = Tables<'entities'>;
export type EntityMetric = Tables<'entity_metrics'>;
export type EntityRating = Tables<'entity_ratings'>;
export type EntityRatingSummary = Views<'entity_rating_summary'>;

export type EntityType = Enums<'entity_type'>;
export type EnvironmentalCategoryName = Enums<'environmental_category'>;
export type EntityMetricName = Enums<'entity_metric'>;
