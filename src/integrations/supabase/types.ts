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
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          target_role: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          target_role?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          target_role?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      claims: {
        Row: {
          created_at: string
          food_listing_id: string
          id: string
          ngo_user_id: string
          notes: string | null
          pickup_scheduled_at: string | null
          status: string
          updated_at: string
          volunteer_name: string | null
          volunteer_phone: string | null
        }
        Insert: {
          created_at?: string
          food_listing_id: string
          id?: string
          ngo_user_id: string
          notes?: string | null
          pickup_scheduled_at?: string | null
          status?: string
          updated_at?: string
          volunteer_name?: string | null
          volunteer_phone?: string | null
        }
        Update: {
          created_at?: string
          food_listing_id?: string
          id?: string
          ngo_user_id?: string
          notes?: string | null
          pickup_scheduled_at?: string | null
          status?: string
          updated_at?: string
          volunteer_name?: string | null
          volunteer_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_food_listing_id_fkey"
            columns: ["food_listing_id"]
            isOneToOne: false
            referencedRelation: "food_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          complaint_type: string
          created_at: string
          description: string
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
          reported_user_id: string | null
          reporter_id: string
          resolution: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          complaint_type: string
          created_at?: string
          description: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          reported_user_id?: string | null
          reporter_id: string
          resolution?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          complaint_type?: string
          created_at?: string
          description?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          resolution?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      distribution_records: {
        Row: {
          beneficiary_group: string | null
          claim_id: string | null
          created_at: string
          distribution_date: string
          id: string
          ngo_user_id: string
          notes: string | null
          quantity_distributed: string | null
        }
        Insert: {
          beneficiary_group?: string | null
          claim_id?: string | null
          created_at?: string
          distribution_date?: string
          id?: string
          ngo_user_id: string
          notes?: string | null
          quantity_distributed?: string | null
        }
        Update: {
          beneficiary_group?: string | null
          claim_id?: string | null
          created_at?: string
          distribution_date?: string
          id?: string
          ngo_user_id?: string
          notes?: string | null
          quantity_distributed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_records_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      food_listings: {
        Row: {
          category: string
          created_at: string
          expiry_date: string
          halal_status: string | null
          id: string
          image_url: string | null
          notes_for_receiver: string | null
          pickup_deadline: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          pickup_time_end: string | null
          pickup_time_start: string | null
          quantity: string
          reserved_at: string | null
          reserved_by: string | null
          spoilage_risk: string | null
          status: string
          storage_condition: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          expiry_date: string
          halal_status?: string | null
          id?: string
          image_url?: string | null
          notes_for_receiver?: string | null
          pickup_deadline?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location: string
          pickup_time_end?: string | null
          pickup_time_start?: string | null
          quantity: string
          reserved_at?: string | null
          reserved_by?: string | null
          spoilage_risk?: string | null
          status?: string
          storage_condition?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          expiry_date?: string
          halal_status?: string | null
          id?: string
          image_url?: string | null
          notes_for_receiver?: string | null
          pickup_deadline?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string
          pickup_time_end?: string | null
          pickup_time_start?: string | null
          quantity?: string
          reserved_at?: string | null
          reserved_by?: string | null
          spoilage_risk?: string | null
          status?: string
          storage_condition?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string | null
          claim_id: string | null
          created_at: string
          expiry_date: string | null
          food_title: string
          id: string
          ngo_user_id: string
          quantity_distributed: string | null
          quantity_received: string | null
          quantity_remaining: string | null
          received_at: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          claim_id?: string | null
          created_at?: string
          expiry_date?: string | null
          food_title: string
          id?: string
          ngo_user_id: string
          quantity_distributed?: string | null
          quantity_received?: string | null
          quantity_remaining?: string | null
          received_at?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          claim_id?: string | null
          created_at?: string
          expiry_date?: string | null
          food_title?: string
          id?: string
          ngo_user_id?: string
          quantity_distributed?: string | null
          quantity_received?: string | null
          quantity_remaining?: string | null
          received_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          business_name: string | null
          created_at: string
          email: string | null
          food_types: string[] | null
          id: string
          name: string | null
          operation_hours: string | null
          phone: string | null
          service_area: string | null
          storage_capacity: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          food_types?: string[] | null
          id: string
          name?: string | null
          operation_hours?: string | null
          phone?: string | null
          service_area?: string | null
          storage_capacity?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          address?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          food_types?: string[] | null
          id?: string
          name?: string | null
          operation_hours?: string | null
          phone?: string | null
          service_area?: string | null
          storage_capacity?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      app_role: "vendor" | "ngo" | "admin"
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
      app_role: ["vendor", "ngo", "admin"],
    },
  },
} as const
