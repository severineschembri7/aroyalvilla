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
      booking_guests: {
        Row: {
          country: string | null
          created_at: string
          email: string
          first_name: string
          last_name: string
          phone: string
          reference: string
          requests: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          first_name: string
          last_name: string
          phone: string
          reference: string
          requests?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string
          reference?: string
          requests?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_guests_reference_fkey"
            columns: ["reference"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["reference"]
          },
        ]
      }
      bookings: {
        Row: {
          addons: string[]
          check_in: string
          check_out: string
          created_at: string
          guests: number
          nights: number
          payment_method: string
          rate_per_night: number
          reason: string | null
          reference: string
          room_id: string
          room_name: string
          status: Database["public"]["Enums"]["booking_status"]
          total: number
          updated_at: string
        }
        Insert: {
          addons?: string[]
          check_in: string
          check_out: string
          created_at?: string
          guests: number
          nights: number
          payment_method: string
          rate_per_night: number
          reason?: string | null
          reference: string
          room_id: string
          room_name: string
          status?: Database["public"]["Enums"]["booking_status"]
          total: number
          updated_at?: string
        }
        Update: {
          addons?: string[]
          check_in?: string
          check_out?: string
          created_at?: string
          guests?: number
          nights?: number
          payment_method?: string
          rate_per_night?: number
          reason?: string | null
          reference?: string
          room_id?: string
          room_name?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          user_id: string
          email: string
          full_name: string
          role: Database["public"]["Enums"]["staff_role"]
          department: string
          phone: string | null
          active: boolean
          hire_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          email: string
          full_name: string
          role: Database["public"]["Enums"]["staff_role"]
          department: string
          phone?: string | null
          active?: boolean
          hire_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          email?: string
          full_name?: string
          role?: Database["public"]["Enums"]["staff_role"]
          department?: string
          phone?: string | null
          active?: boolean
          hire_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_statuses: {
        Row: { room_id: string; status: Database["public"]["Enums"]["room_status_type"]; updated_by: string | null; notes: string | null; updated_at: string }
        Insert: { room_id: string; status?: Database["public"]["Enums"]["room_status_type"]; updated_by?: string | null; notes?: string | null; updated_at?: string }
        Update: { room_id?: string; status?: Database["public"]["Enums"]["room_status_type"]; updated_by?: string | null; notes?: string | null; updated_at?: string }
        Relationships: []
      }
      billing_items: {
        Row: { id: string; folio_id: string | null; booking_reference: string; description: string; amount: number; kind: string; created_at: string }
        Insert: { id?: string; folio_id?: string | null; booking_reference: string; description: string; amount: number; kind: string; created_at?: string }
        Update: { id?: string; folio_id?: string | null; booking_reference?: string; description?: string; amount?: number; kind?: string; created_at?: string }
        Relationships: []
      }
      restaurant_orders: {
        Row: { id: string; booking_reference: string; table_number: number | null; guest_name: string; items: string[]; status: Database["public"]["Enums"]["order_status_type"]; kind: string; total: number; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; booking_reference: string; table_number?: number | null; guest_name: string; items?: string[]; status?: Database["public"]["Enums"]["order_status_type"]; kind: string; total?: number; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; booking_reference?: string; table_number?: number | null; guest_name?: string; items?: string[]; status?: Database["public"]["Enums"]["order_status_type"]; kind?: string; total?: number; created_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      guest_profiles: {
        Row: { id: string; email: string; phone: string | null; preferences: Json | null; created_at: string; updated_at: string }
        Insert: { id?: string; email: string; phone?: string | null; preferences?: Json | null; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; phone?: string | null; preferences?: Json | null; created_at?: string; updated_at?: string }
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
      booking_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
      staff_role: "front_desk" | "restaurant_bar" | "housekeeping" | "management"
      room_status_type: "available" | "occupied" | "dirty" | "maintenance"
      order_status_type: "open" | "preparing" | "ready" | "served" | "closed"
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
      booking_status: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
    },
  },
} as const
