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
      beneficiaries: {
        Row: {
          address: string | null
          category: string | null
          created_at: string | null
          household_size: number | null
          id: string
          is_active: boolean | null
          name: string
          ngo_id: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          household_size?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          ngo_id: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          household_size?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          ngo_id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_ngo_id_fkey"
            columns: ["ngo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_cancellations: {
        Row: {
          batch_id: string
          cancelled_at: string | null
          category: string | null
          food_name: string
          id: string
          item_id: string
          ngo_id: string
          quantity: number | null
          reason: string | null
          unit: string | null
        }
        Insert: {
          batch_id: string
          cancelled_at?: string | null
          category?: string | null
          food_name: string
          id?: string
          item_id: string
          ngo_id: string
          quantity?: number | null
          reason?: string | null
          unit?: string | null
        }
        Update: {
          batch_id?: string
          cancelled_at?: string | null
          category?: string | null
          food_name?: string
          id?: string
          item_id?: string
          ngo_id?: string
          quantity?: number | null
          reason?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_cancellations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "donation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_cancellations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "donation_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_cancellations_ngo_id_fkey"
            columns: ["ngo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      distribution_beneficiaries: {
        Row: {
          beneficiary_id: string
          created_at: string | null
          distribution_id: string
          id: string
          items_received: Json | null
          notes: string | null
        }
        Insert: {
          beneficiary_id: string
          created_at?: string | null
          distribution_id: string
          id?: string
          items_received?: Json | null
          notes?: string | null
        }
        Update: {
          beneficiary_id?: string
          created_at?: string | null
          distribution_id?: string
          id?: string
          items_received?: Json | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_beneficiaries_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_beneficiaries_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "distribution_records"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_records: {
        Row: {
          beneficiary_group: string | null
          beneficiary_id: string | null
          claim_id: string | null
          created_at: string
          distribution_date: string
          id: string
          inventory_id: string | null
          ngo_user_id: string
          notes: string | null
          photo_urls: string[] | null
          quantity_distributed: string | null
        }
        Insert: {
          beneficiary_group?: string | null
          beneficiary_id?: string | null
          claim_id?: string | null
          created_at?: string
          distribution_date?: string
          id?: string
          inventory_id?: string | null
          ngo_user_id: string
          notes?: string | null
          photo_urls?: string[] | null
          quantity_distributed?: string | null
        }
        Update: {
          beneficiary_group?: string | null
          beneficiary_id?: string | null
          claim_id?: string | null
          created_at?: string
          distribution_date?: string
          id?: string
          inventory_id?: string | null
          ngo_user_id?: string
          notes?: string | null
          photo_urls?: string[] | null
          quantity_distributed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_records_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_records_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_records_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_batches: {
        Row: {
          batch_number: string
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          donation_type: string
          id: string
          notes: string | null
          pickup_date: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          pickup_time_end: string | null
          pickup_time_start: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          batch_number?: string
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          donation_type?: string
          id?: string
          notes?: string | null
          pickup_date?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location: string
          pickup_time_end?: string | null
          pickup_time_start?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          batch_number?: string
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          donation_type?: string
          id?: string
          notes?: string | null
          pickup_date?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string
          pickup_time_end?: string | null
          pickup_time_start?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      donation_items: {
        Row: {
          batch_id: string
          category: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          estimated_value: number | null
          expiry_date: string | null
          expiry_time: string | null
          food_name: string
          halal_status: string
          id: string
          image_url: string | null
          notes: string | null
          pickup_photo_url: string | null
          quantity: number
          spoilage_risk: string | null
          status: string
          storage_condition: string
          unit: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          category: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          estimated_value?: number | null
          expiry_date?: string | null
          expiry_time?: string | null
          food_name: string
          halal_status?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          pickup_photo_url?: string | null
          quantity: number
          spoilage_risk?: string | null
          status?: string
          storage_condition?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          estimated_value?: number | null
          expiry_date?: string | null
          expiry_time?: string | null
          food_name?: string
          halal_status?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          pickup_photo_url?: string | null
          quantity?: number
          spoilage_risk?: string | null
          status?: string
          storage_condition?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "donation_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_templates: {
        Row: {
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          id: string
          items: Json
          name: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string | null
          pickup_time_end: string | null
          pickup_time_start: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          items?: Json
          name: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string | null
          pickup_time_end?: string | null
          pickup_time_start?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          items?: Json
          name?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string | null
          pickup_time_end?: string | null
          pickup_time_start?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          feedback_type: string
          id: string
          is_anonymous: boolean
          rating: number
          related_entity_id: string | null
          related_entity_type: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          is_anonymous?: boolean
          rating: number
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          is_anonymous?: boolean
          rating?: number
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_id?: string
        }
        Relationships: []
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
          notes: string | null
          quantity_distributed: string | null
          quantity_received: string | null
          quantity_remaining: string | null
          received_at: string
          storage_location: string | null
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
          notes?: string | null
          quantity_distributed?: string | null
          quantity_received?: string | null
          quantity_remaining?: string | null
          received_at?: string
          storage_location?: string | null
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
          notes?: string | null
          quantity_distributed?: string | null
          quantity_received?: string | null
          quantity_remaining?: string | null
          received_at?: string
          storage_location?: string | null
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
      inventory_transactions: {
        Row: {
          category: string | null
          created_at: string | null
          destination_id: string | null
          destination_name: string | null
          destination_type: string | null
          food_name: string
          id: string
          inventory_id: string | null
          ngo_user_id: string
          notes: string | null
          quantity: number
          source_id: string | null
          source_name: string | null
          source_type: string | null
          transaction_type: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          destination_id?: string | null
          destination_name?: string | null
          destination_type?: string | null
          food_name: string
          id?: string
          inventory_id?: string | null
          ngo_user_id: string
          notes?: string | null
          quantity: number
          source_id?: string | null
          source_name?: string | null
          source_type?: string | null
          transaction_type: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          destination_id?: string | null
          destination_name?: string | null
          destination_type?: string | null
          food_name?: string
          id?: string
          inventory_id?: string | null
          ngo_user_id?: string
          notes?: string | null
          quantity?: number
          source_id?: string | null
          source_name?: string | null
          source_type?: string | null
          transaction_type?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
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
      outlets: {
        Row: {
          address: string | null
          address_lat: number | null
          address_lng: number | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_primary: boolean
          outlet_name: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_lat?: number | null
          address_lng?: number | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          outlet_name: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_lat?: number | null
          address_lng?: number | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          outlet_name?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          address_lat: number | null
          address_lng: number | null
          branch_name: string | null
          business_name: string | null
          business_type: string | null
          created_at: string
          email: string | null
          food_types: string[] | null
          has_multiple_outlets: boolean
          id: string
          is_suspended: boolean
          name: string | null
          operation_hours: string | null
          phone: string | null
          rejection_reason: string | null
          service_area: string | null
          storage_capacity: string | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          address?: string | null
          address_lat?: number | null
          address_lng?: number | null
          branch_name?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          food_types?: string[] | null
          has_multiple_outlets?: boolean
          id: string
          is_suspended?: boolean
          name?: string | null
          operation_hours?: string | null
          phone?: string | null
          rejection_reason?: string | null
          service_area?: string | null
          storage_capacity?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          address?: string | null
          address_lat?: number | null
          address_lng?: number | null
          branch_name?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          email?: string | null
          food_types?: string[] | null
          has_multiple_outlets?: boolean
          id?: string
          is_suspended?: boolean
          name?: string | null
          operation_hours?: string | null
          phone?: string | null
          rejection_reason?: string | null
          service_area?: string | null
          storage_capacity?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
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
