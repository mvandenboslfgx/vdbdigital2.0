export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_studies: {
        Row: {
          content: string
          created_at: string
          id: string
          industry: string | null
          published: boolean
          slug: string
          solution_type: string | null
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          industry?: string | null
          published?: boolean
          slug: string
          solution_type?: string | null
          sort_order?: number
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          industry?: string | null
          published?: boolean
          slug?: string
          solution_type?: string | null
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          description_nl: string | null
          id: string
          image_path: string | null
          is_active: boolean
          name: string
          name_nl: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_nl?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name: string
          name_nl?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_nl?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name?: string
          name_nl?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          preferences: Json
          session_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          preferences: Json
          session_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          preferences?: Json
          session_id?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          locale: string
          message: string
          name: string
          phone: string | null
          subject: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          locale?: string
          message: string
          name: string
          phone?: string | null
          subject: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          locale?: string
          message?: string
          name?: string
          phone?: string | null
          subject?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          company: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          metadata: Json | null
          name: string
          status: Database["public"]["Enums"]["lead_status"]
          subject: string | null
          type: Database["public"]["Enums"]["lead_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          metadata?: Json | null
          name: string
          status?: Database["public"]["Enums"]["lead_status"]
          subject?: string | null
          type: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          name?: string
          status?: Database["public"]["Enums"]["lead_status"]
          subject?: string | null
          type?: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          billing_type: Database["public"]["Enums"]["billing_type"]
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_slug: string
          quantity: number
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          billing_type: Database["public"]["Enums"]["billing_type"]
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_slug: string
          quantity: number
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          billing_type?: Database["public"]["Enums"]["billing_type"]
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_slug?: string
          quantity?: number
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          confirmation_sent: boolean
          created_at: string
          customer_company: string | null
          customer_email: string
          customer_first_name: string
          customer_id: string | null
          customer_last_name: string
          customer_phone: string | null
          customer_type: string | null
          delivery_released: boolean
          id: string
          idempotency_key: string | null
          notes: string | null
          order_number: string
          payment_init_status: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
          vat_cents: number
          vat_rate: number
        }
        Insert: {
          confirmation_sent?: boolean
          created_at?: string
          customer_company?: string | null
          customer_email: string
          customer_first_name: string
          customer_id?: string | null
          customer_last_name: string
          customer_phone?: string | null
          customer_type?: string | null
          delivery_released?: boolean
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number: string
          payment_init_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at?: string
          vat_cents: number
          vat_rate?: number
        }
        Update: {
          confirmation_sent?: boolean
          created_at?: string
          customer_company?: string | null
          customer_email?: string
          customer_first_name?: string
          customer_id?: string | null
          customer_last_name?: string
          customer_phone?: string | null
          customer_type?: string | null
          delivery_released?: boolean
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_number?: string
          payment_init_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          vat_cents?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_internal_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_internal_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_internal_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          customer_role: Database["public"]["Enums"]["customer_org_role"]
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["portal_invite_status"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          customer_role?: Database["public"]["Enums"]["customer_org_role"]
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["portal_invite_status"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          customer_role?: Database["public"]["Enums"]["customer_org_role"]
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["portal_invite_status"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          customer_role: Database["public"]["Enums"]["customer_org_role"]
          id: string
          invited_at: string | null
          is_primary_contact: boolean
          joined_at: string | null
          organization_id: string
          status: Database["public"]["Enums"]["org_member_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_role?: Database["public"]["Enums"]["customer_org_role"]
          id?: string
          invited_at?: string | null
          is_primary_contact?: boolean
          joined_at?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["org_member_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          customer_role?: Database["public"]["Enums"]["customer_org_role"]
          id?: string
          invited_at?: string | null
          is_primary_contact?: boolean
          joined_at?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["org_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          account_manager_id: string | null
          archived_at: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          customer_number: string | null
          id: string
          invoice_address: string | null
          kvk_number: string | null
          legal_name: string
          locale: string
          status: Database["public"]["Enums"]["organization_status"]
          trade_name: string | null
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          account_manager_id?: string | null
          archived_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_number?: string | null
          id?: string
          invoice_address?: string | null
          kvk_number?: string | null
          legal_name: string
          locale?: string
          status?: Database["public"]["Enums"]["organization_status"]
          trade_name?: string | null
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          account_manager_id?: string | null
          archived_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_number?: string | null
          id?: string
          invoice_address?: string | null
          kvk_number?: string | null
          legal_name?: string
          locale?: string
          status?: Database["public"]["Enums"]["organization_status"]
          trade_name?: string | null
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_adjustments: {
        Row: {
          actor_user_id: string
          amount_cents: number
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          partner_id: string
          reason: string
          reference_id: string
          reference_type: string
          related_commission_id: string | null
          related_payout_id: string | null
        }
        Insert: {
          actor_user_id: string
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          partner_id: string
          reason: string
          reference_id: string
          reference_type: string
          related_commission_id?: string | null
          related_payout_id?: string | null
        }
        Update: {
          actor_user_id?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          partner_id?: string
          reason?: string
          reference_id?: string
          reference_type?: string
          related_commission_id?: string | null
          related_payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_adjustments_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_adjustments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_adjustments_related_commission_id_fkey"
            columns: ["related_commission_id"]
            isOneToOne: false
            referencedRelation: "partner_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_adjustments_related_payout_id_fkey"
            columns: ["related_payout_id"]
            isOneToOne: false
            referencedRelation: "partner_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          contact_email: string
          contact_phone: string | null
          created_at: string
          id: string
          kvk_number: string | null
          legal_name: string
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["partner_application_status"]
          submitted_at: string | null
          trade_name: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
          version: number
        }
        Insert: {
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          kvk_number?: string | null
          legal_name?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["partner_application_status"]
          submitted_at?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
          version?: number
        }
        Update: {
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          kvk_number?: string | null
          legal_name?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["partner_application_status"]
          submitted_at?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_cash_receipts: {
        Row: {
          actor_user_id: string
          amount_cents: number
          created_at: string
          currency: string
          evidence_note: string | null
          evidence_uri: string | null
          id: string
          idempotency_key: string
          partner_id: string | null
        }
        Insert: {
          actor_user_id: string
          amount_cents: number
          created_at?: string
          currency?: string
          evidence_note?: string | null
          evidence_uri?: string | null
          id?: string
          idempotency_key: string
          partner_id?: string | null
        }
        Update: {
          actor_user_id?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          evidence_note?: string | null
          evidence_uri?: string | null
          id?: string
          idempotency_key?: string
          partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_cash_receipts_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_cash_receipts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_codes: {
        Row: {
          code_display: string
          code_normalized: string
          created_at: string
          id: string
          partner_id: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["partner_code_status"]
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code_display: string
          code_normalized: string
          created_at?: string
          id?: string
          partner_id: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["partner_code_status"]
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code_display?: string
          code_normalized?: string
          created_at?: string
          id?: string
          partner_id?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["partner_code_status"]
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_codes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commissions: {
        Row: {
          amount_cents: number
          approved_at: string | null
          basis_amount_cents: number
          calculation_rule_version: string
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          paid_at: string | null
          partner_id: string
          partner_sale_id: string
          rate_bps: number
          status: Database["public"]["Enums"]["partner_commission_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          basis_amount_cents: number
          calculation_rule_version?: string
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          paid_at?: string | null
          partner_id: string
          partner_sale_id: string
          rate_bps: number
          status?: Database["public"]["Enums"]["partner_commission_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          basis_amount_cents?: number
          calculation_rule_version?: string
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          paid_at?: string | null
          partner_id?: string
          partner_sale_id?: string
          rate_bps?: number
          status?: Database["public"]["Enums"]["partner_commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_partner_sale_id_fkey"
            columns: ["partner_sale_id"]
            isOneToOne: true
            referencedRelation: "partner_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leads: {
        Row: {
          assigned_to: string | null
          attribution_locked_at: string | null
          company_name: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          converted_sale_id: string | null
          created_at: string
          created_by: string | null
          dedupe_key: string
          id: string
          message: string | null
          partner_code_id: string | null
          partner_id: string
          rejected_reason: string | null
          status: Database["public"]["Enums"]["partner_lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attribution_locked_at?: string | null
          company_name?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          converted_sale_id?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key: string
          id?: string
          message?: string | null
          partner_code_id?: string | null
          partner_id: string
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["partner_lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attribution_locked_at?: string | null
          company_name?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          converted_sale_id?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string
          id?: string
          message?: string | null
          partner_code_id?: string | null
          partner_id?: string
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["partner_lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_leads_converted_sale_fkey"
            columns: ["converted_sale_id"]
            isOneToOne: false
            referencedRelation: "partner_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_leads_partner_code_id_fkey"
            columns: ["partner_code_id"]
            isOneToOne: false
            referencedRelation: "partner_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_ledger_entries: {
        Row: {
          account: Database["public"]["Enums"]["partner_ledger_account"]
          credit_cents: number
          debit_cents: number
          id: string
          partner_id: string | null
          transaction_id: string
        }
        Insert: {
          account: Database["public"]["Enums"]["partner_ledger_account"]
          credit_cents?: number
          debit_cents?: number
          id?: string
          partner_id?: string | null
          transaction_id: string
        }
        Update: {
          account?: Database["public"]["Enums"]["partner_ledger_account"]
          credit_cents?: number
          debit_cents?: number
          id?: string
          partner_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_ledger_entries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "partner_ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_ledger_transactions: {
        Row: {
          actor_user_id: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          reference_id: string
          reference_type: string
          transaction_type: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          reference_id: string
          reference_type: string
          transaction_type: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          reference_id?: string
          reference_type?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_ledger_transactions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payout_requests: {
        Row: {
          available_amount_snapshot_cents: number
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          partner_id: string
          rejection_reason: string | null
          requested_amount_cents: number
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["partner_payout_request_status"]
        }
        Insert: {
          available_amount_snapshot_cents: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          partner_id: string
          rejection_reason?: string | null
          requested_amount_cents: number
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["partner_payout_request_status"]
        }
        Update: {
          available_amount_snapshot_cents?: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          partner_id?: string
          rejection_reason?: string | null
          requested_amount_cents?: number
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["partner_payout_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "partner_payout_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payout_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          external_reference: string | null
          id: string
          paid_at: string | null
          partner_id: string
          payout_method: string
          payout_request_id: string
          status: Database["public"]["Enums"]["partner_payout_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          partner_id: string
          payout_method?: string
          payout_request_id: string
          status?: Database["public"]["Enums"]["partner_payout_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          partner_id?: string
          payout_method?: string
          payout_request_id?: string
          status?: Database["public"]["Enums"]["partner_payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payouts_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: true
            referencedRelation: "partner_payout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_profiles: {
        Row: {
          compliance_status: string
          created_at: string
          display_name: string | null
          id: string
          legal_name: string | null
          payout_eligible: boolean
          revoked_at: string | null
          status: Database["public"]["Enums"]["partner_profile_status"]
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          compliance_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          legal_name?: string | null
          payout_eligible?: boolean
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["partner_profile_status"]
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          compliance_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          legal_name?: string | null
          payout_eligible?: boolean
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["partner_profile_status"]
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_sales: {
        Row: {
          confirmed_at: string | null
          created_at: string
          currency: string
          gross_amount_cents: number
          id: string
          idempotency_key: string
          order_id: string | null
          partner_id: string
          partner_lead_id: string | null
          payment_id: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["partner_sale_status"]
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          gross_amount_cents: number
          id?: string
          idempotency_key: string
          order_id?: string | null
          partner_id: string
          partner_lead_id?: string | null
          payment_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["partner_sale_status"]
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          gross_amount_cents?: number
          id?: string
          idempotency_key?: string
          order_id?: string | null
          partner_id?: string
          partner_lead_id?: string | null
          payment_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["partner_sale_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_sales_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sales_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sales_partner_lead_id_fkey"
            columns: ["partner_lead_id"]
            isOneToOne: false
            referencedRelation: "partner_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          order_id: string
          provider_status: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id: string
          order_id: string
          provider_status?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          order_id?: string
          provider_status?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_conversation_participants: {
        Row: {
          conversation_id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "portal_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          organization_id: string
          project_id: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          organization_id: string
          project_id?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          organization_id?: string
          project_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_document_download_events: {
        Row: {
          actor_audience: string
          actor_user_id: string | null
          created_at: string
          document_id: string
          id: string
          organization_id: string
        }
        Insert: {
          actor_audience: string
          actor_user_id?: string | null
          created_at?: string
          document_id: string
          id?: string
          organization_id: string
        }
        Update: {
          actor_audience?: string
          actor_user_id?: string | null
          created_at?: string
          document_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_document_download_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_document_download_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "portal_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_document_download_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_files: {
        Row: {
          archived_at: string | null
          bucket: string
          category: Database["public"]["Enums"]["portal_document_category"]
          change_summary: string | null
          checksum_sha256: string | null
          created_at: string
          customer_visible: boolean
          deliverable_id: string | null
          description: string | null
          document_number: string
          file_extension: string | null
          file_name: string
          id: string
          invoice_id: string | null
          is_current: boolean
          mime_type: string
          organization_id: string
          parent_document_id: string | null
          project_id: string | null
          quote_id: string | null
          safe_filename: string
          scan_provider: string | null
          scan_reference: string | null
          scan_status: Database["public"]["Enums"]["portal_document_scan_status"]
          scanned_at: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["portal_document_status"]
          storage_path: string
          support_ticket_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          version: number
          version_number: number
          visibility: Database["public"]["Enums"]["portal_document_visibility"]
        }
        Insert: {
          archived_at?: string | null
          bucket: string
          category?: Database["public"]["Enums"]["portal_document_category"]
          change_summary?: string | null
          checksum_sha256?: string | null
          created_at?: string
          customer_visible?: boolean
          deliverable_id?: string | null
          description?: string | null
          document_number: string
          file_extension?: string | null
          file_name: string
          id?: string
          invoice_id?: string | null
          is_current?: boolean
          mime_type: string
          organization_id: string
          parent_document_id?: string | null
          project_id?: string | null
          quote_id?: string | null
          safe_filename: string
          scan_provider?: string | null
          scan_reference?: string | null
          scan_status?: Database["public"]["Enums"]["portal_document_scan_status"]
          scanned_at?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["portal_document_status"]
          storage_path: string
          support_ticket_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
          version_number?: number
          visibility?: Database["public"]["Enums"]["portal_document_visibility"]
        }
        Update: {
          archived_at?: string | null
          bucket?: string
          category?: Database["public"]["Enums"]["portal_document_category"]
          change_summary?: string | null
          checksum_sha256?: string | null
          created_at?: string
          customer_visible?: boolean
          deliverable_id?: string | null
          description?: string | null
          document_number?: string
          file_extension?: string | null
          file_name?: string
          id?: string
          invoice_id?: string | null
          is_current?: boolean
          mime_type?: string
          organization_id?: string
          parent_document_id?: string | null
          project_id?: string | null
          quote_id?: string | null
          safe_filename?: string
          scan_provider?: string | null
          scan_reference?: string | null
          scan_status?: Database["public"]["Enums"]["portal_document_scan_status"]
          scanned_at?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["portal_document_status"]
          storage_path?: string
          support_ticket_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
          version_number?: number
          visibility?: Database["public"]["Enums"]["portal_document_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "portal_files_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "portal_project_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_files_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "portal_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_files_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "portal_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_files_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "portal_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_files_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: false
            referencedRelation: "portal_support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invoice_items: {
        Row: {
          created_at: string
          description: string | null
          discount_cents: number
          id: string
          invoice_id: string
          item_type: Database["public"]["Enums"]["portal_invoice_item_type"]
          quantity: number
          quantity_scale: number
          sort_order: number
          source_quote_item_id: string | null
          subtotal_cents: number
          tax_cents: number
          tax_rate_basis_points: number
          title: string
          total_cents: number
          unit_label: string
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_cents?: number
          id?: string
          invoice_id: string
          item_type?: Database["public"]["Enums"]["portal_invoice_item_type"]
          quantity?: number
          quantity_scale?: number
          sort_order?: number
          source_quote_item_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          tax_rate_basis_points?: number
          title: string
          total_cents?: number
          unit_label?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_cents?: number
          id?: string
          invoice_id?: string
          item_type?: Database["public"]["Enums"]["portal_invoice_item_type"]
          quantity?: number
          quantity_scale?: number
          sort_order?: number
          source_quote_item_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          tax_rate_basis_points?: number
          title?: string
          total_cents?: number
          unit_label?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "portal_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invoice_payment_records: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          external_reference: string | null
          id: string
          idempotency_key: string | null
          internal_note: string | null
          invoice_id: string
          payment_date: string
          payment_method: Database["public"]["Enums"]["portal_invoice_payment_method"]
          recorded_by: string
          reversal_idempotency_key: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          idempotency_key?: string | null
          internal_note?: string | null
          invoice_id: string
          payment_date: string
          payment_method?: Database["public"]["Enums"]["portal_invoice_payment_method"]
          recorded_by: string
          reversal_idempotency_key?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          idempotency_key?: string | null
          internal_note?: string | null
          invoice_id?: string
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["portal_invoice_payment_method"]
          recorded_by?: string
          reversal_idempotency_key?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_invoice_payment_records_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "portal_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoice_payment_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoice_payment_records_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invoice_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string | null
          id: string
          invoice_id: string
          snapshot: Json
          snapshot_checksum: string
          status: Database["public"]["Enums"]["portal_invoice_status"]
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          invoice_id: string
          snapshot: Json
          snapshot_checksum: string
          status: Database["public"]["Enums"]["portal_invoice_status"]
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          invoice_id?: string
          snapshot?: Json
          snapshot_checksum?: string
          status?: Database["public"]["Enums"]["portal_invoice_status"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "portal_invoice_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoice_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "portal_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoice_versions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "portal_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invoices: {
        Row: {
          accepted_quote_version_id: string | null
          amount_due_cents: number
          amount_paid_cents: number
          archived_at: string | null
          canceled_at: string | null
          created_at: string
          created_by: string | null
          credited_at: string | null
          credits_invoice_id: string | null
          currency: string
          current_version_number: number
          customer_visible: boolean
          description: string | null
          discount_cents: number
          document_id: string | null
          document_path: string | null
          due_date: string | null
          external_accounting_reference: string | null
          external_payment_reference: string | null
          external_reference: string | null
          id: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["portal_invoice_type"]
          issue_date: string | null
          issued_at: string | null
          issued_by: string | null
          note: string | null
          organization_id: string
          paid_at: string | null
          payment_instruction: string | null
          project_id: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["portal_invoice_status"]
          status_updated_by: string | null
          subtotal_cents: number
          title: string | null
          total_cents: number
          updated_at: string
          vat_cents: number
          version: number
        }
        Insert: {
          accepted_quote_version_id?: string | null
          amount_due_cents?: number
          amount_paid_cents?: number
          archived_at?: string | null
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          credited_at?: string | null
          credits_invoice_id?: string | null
          currency?: string
          current_version_number?: number
          customer_visible?: boolean
          description?: string | null
          discount_cents?: number
          document_id?: string | null
          document_path?: string | null
          due_date?: string | null
          external_accounting_reference?: string | null
          external_payment_reference?: string | null
          external_reference?: string | null
          id?: string
          invoice_number: string
          invoice_type?: Database["public"]["Enums"]["portal_invoice_type"]
          issue_date?: string | null
          issued_at?: string | null
          issued_by?: string | null
          note?: string | null
          organization_id: string
          paid_at?: string | null
          payment_instruction?: string | null
          project_id?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["portal_invoice_status"]
          status_updated_by?: string | null
          subtotal_cents?: number
          title?: string | null
          total_cents?: number
          updated_at?: string
          vat_cents?: number
          version?: number
        }
        Update: {
          accepted_quote_version_id?: string | null
          amount_due_cents?: number
          amount_paid_cents?: number
          archived_at?: string | null
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          credited_at?: string | null
          credits_invoice_id?: string | null
          currency?: string
          current_version_number?: number
          customer_visible?: boolean
          description?: string | null
          discount_cents?: number
          document_id?: string | null
          document_path?: string | null
          due_date?: string | null
          external_accounting_reference?: string | null
          external_payment_reference?: string | null
          external_reference?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: Database["public"]["Enums"]["portal_invoice_type"]
          issue_date?: string | null
          issued_at?: string | null
          issued_by?: string | null
          note?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_instruction?: string | null
          project_id?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["portal_invoice_status"]
          status_updated_by?: string | null
          subtotal_cents?: number
          title?: string | null
          total_cents?: number
          updated_at?: string
          vat_cents?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "portal_invoices_accepted_quote_version_id_fkey"
            columns: ["accepted_quote_version_id"]
            isOneToOne: false
            referencedRelation: "portal_quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoices_credits_invoice_id_fkey"
            columns: ["credits_invoice_id"]
            isOneToOne: false
            referencedRelation: "portal_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "portal_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoices_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "portal_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invoices_status_updated_by_fkey"
            columns: ["status_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          author_user_id: string
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_internal: boolean
        }
        Insert: {
          author_user_id: string
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
        }
        Update: {
          author_user_id?: string
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "portal_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_notifications: {
        Row: {
          body: string | null
          created_at: string
          email_status: string
          href: string | null
          id: string
          organization_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          email_status?: string
          href?: string | null
          id?: string
          organization_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          email_status?: string
          href?: string | null
          id?: string
          organization_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_project_actions: {
        Row: {
          assigned_organization_id: string | null
          assigned_to_type: Database["public"]["Enums"]["portal_action_assignee"]
          assigned_user_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_visible: boolean
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          status: Database["public"]["Enums"]["portal_action_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          assigned_organization_id?: string | null
          assigned_to_type?: Database["public"]["Enums"]["portal_action_assignee"]
          assigned_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_visible?: boolean
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          status?: Database["public"]["Enums"]["portal_action_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          assigned_organization_id?: string | null
          assigned_to_type?: Database["public"]["Enums"]["portal_action_assignee"]
          assigned_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_visible?: boolean
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          status?: Database["public"]["Enums"]["portal_action_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "portal_project_actions_assigned_organization_id_fkey"
            columns: ["assigned_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_actions_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_actions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_project_activity: {
        Row: {
          activity_type: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata_safe: Json
          project_id: string
          summary: string
          visibility: Database["public"]["Enums"]["portal_activity_visibility"]
        }
        Insert: {
          activity_type: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata_safe?: Json
          project_id: string
          summary: string
          visibility?: Database["public"]["Enums"]["portal_activity_visibility"]
        }
        Update: {
          activity_type?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata_safe?: Json
          project_id?: string
          summary?: string
          visibility?: Database["public"]["Enums"]["portal_activity_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "portal_project_activity_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_project_deliverables: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          customer_visible: boolean
          description: string | null
          id: string
          project_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_approval: boolean
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          id?: string
          project_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          id?: string
          project_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "portal_project_deliverables_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_deliverables_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_project_feedback: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          decision: string | null
          deliverable_id: string | null
          edited_at: string | null
          id: string
          organization_id: string | null
          project_id: string
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          decision?: string | null
          deliverable_id?: string | null
          edited_at?: string | null
          id?: string
          organization_id?: string | null
          project_id: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          decision?: string | null
          deliverable_id?: string | null
          edited_at?: string | null
          id?: string
          organization_id?: string | null
          project_id?: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_project_feedback_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_feedback_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "portal_project_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_project_members: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          project_role: Database["public"]["Enums"]["portal_project_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          project_role?: Database["public"]["Enums"]["portal_project_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          project_role?: Database["public"]["Enums"]["portal_project_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_project_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_visible: boolean
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          requires_customer_action: boolean
          sort_order: number
          status: Database["public"]["Enums"]["portal_milestone_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          requires_customer_action?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["portal_milestone_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_visible?: boolean
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          requires_customer_action?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["portal_milestone_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "portal_project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_projects: {
        Row: {
          actual_delivery_date: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          customer_visible: boolean
          description: string | null
          id: string
          name: string
          organization_id: string
          planned_delivery_date: string | null
          priority: string
          progress_percent: number
          project_manager_id: string | null
          project_number: string
          project_type: Database["public"]["Enums"]["portal_project_type"]
          slug: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["portal_project_status"]
          updated_at: string
          version: number
          visibility: string
        }
        Insert: {
          actual_delivery_date?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_visible?: boolean
          description?: string | null
          id?: string
          name: string
          organization_id: string
          planned_delivery_date?: string | null
          priority?: string
          progress_percent?: number
          project_manager_id?: string | null
          project_number: string
          project_type?: Database["public"]["Enums"]["portal_project_type"]
          slug?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["portal_project_status"]
          updated_at?: string
          version?: number
          visibility?: string
        }
        Update: {
          actual_delivery_date?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_visible?: boolean
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          planned_delivery_date?: string | null
          priority?: string
          progress_percent?: number
          project_manager_id?: string | null
          project_number?: string
          project_type?: Database["public"]["Enums"]["portal_project_type"]
          slug?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["portal_project_status"]
          updated_at?: string
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_quote_acceptances: {
        Row: {
          acceptance_checksum: string
          accepted_at: string
          accepted_by: string
          accepted_currency: string
          accepted_terms_version: string
          accepted_total_cents: number
          id: string
          ip_hash: string | null
          organization_id: string
          quote_id: string
          quote_version_id: string
          selected_optional_item_ids: string[]
          user_agent_hash: string | null
        }
        Insert: {
          acceptance_checksum: string
          accepted_at?: string
          accepted_by: string
          accepted_currency?: string
          accepted_terms_version: string
          accepted_total_cents: number
          id?: string
          ip_hash?: string | null
          organization_id: string
          quote_id: string
          quote_version_id: string
          selected_optional_item_ids?: string[]
          user_agent_hash?: string | null
        }
        Update: {
          acceptance_checksum?: string
          accepted_at?: string
          accepted_by?: string
          accepted_currency?: string
          accepted_terms_version?: string
          accepted_total_cents?: number
          id?: string
          ip_hash?: string | null
          organization_id?: string
          quote_id?: string
          quote_version_id?: string
          selected_optional_item_ids?: string[]
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_quote_acceptances_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quote_acceptances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quote_acceptances_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "portal_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quote_acceptances_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "portal_quote_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_quote_items: {
        Row: {
          addon_id: string | null
          created_at: string
          description: string | null
          discount_cents: number
          id: string
          is_optional: boolean
          is_selected: boolean
          item_type: Database["public"]["Enums"]["portal_quote_item_type"]
          product_id: string | null
          quantity: number
          quote_id: string
          sort_order: number
          subtotal_cents: number
          tax_cents: number
          tax_rate_basis_points: number
          title: string
          total_cents: number
          unit_label: string
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          addon_id?: string | null
          created_at?: string
          description?: string | null
          discount_cents?: number
          id?: string
          is_optional?: boolean
          is_selected?: boolean
          item_type?: Database["public"]["Enums"]["portal_quote_item_type"]
          product_id?: string | null
          quantity?: number
          quote_id: string
          sort_order?: number
          subtotal_cents?: number
          tax_cents?: number
          tax_rate_basis_points?: number
          title: string
          total_cents?: number
          unit_label?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          addon_id?: string | null
          created_at?: string
          description?: string | null
          discount_cents?: number
          id?: string
          is_optional?: boolean
          is_selected?: boolean
          item_type?: Database["public"]["Enums"]["portal_quote_item_type"]
          product_id?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          subtotal_cents?: number
          tax_cents?: number
          tax_rate_basis_points?: number
          title?: string
          total_cents?: number
          unit_label?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "portal_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_quote_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string | null
          id: string
          quote_id: string
          snapshot: Json
          snapshot_checksum: string
          status: Database["public"]["Enums"]["portal_quote_status"]
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          quote_id: string
          snapshot: Json
          snapshot_checksum: string
          status: Database["public"]["Enums"]["portal_quote_status"]
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          quote_id?: string
          snapshot?: Json
          snapshot_checksum?: string
          status?: Database["public"]["Enums"]["portal_quote_status"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "portal_quote_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quote_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "portal_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "portal_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_quotes: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          accepted_currency: string | null
          accepted_terms_version: string | null
          accepted_total_cents: number | null
          accepted_version_number: number | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_version_number: number
          customer_note: string | null
          decline_reason: string | null
          declined_at: string | null
          declined_by: string | null
          description: string | null
          discount_cents: number
          document_id: string | null
          document_path: string | null
          first_viewed_at: string | null
          id: string
          organization_id: string
          privacy_version: string | null
          project_id: string | null
          quote_number: string
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["portal_quote_status"]
          subtotal_cents: number
          terms_version: string | null
          title: string
          total_cents: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          vat_cents: number
          version: number
          withdraw_reason: string | null
          withdrawn_at: string | null
          withdrawn_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_currency?: string | null
          accepted_terms_version?: string | null
          accepted_total_cents?: number | null
          accepted_version_number?: number | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_version_number?: number
          customer_note?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          discount_cents?: number
          document_id?: string | null
          document_path?: string | null
          first_viewed_at?: string | null
          id?: string
          organization_id: string
          privacy_version?: string | null
          project_id?: string | null
          quote_number: string
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["portal_quote_status"]
          subtotal_cents?: number
          terms_version?: string | null
          title: string
          total_cents?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          vat_cents?: number
          version?: number
          withdraw_reason?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_currency?: string | null
          accepted_terms_version?: string | null
          accepted_total_cents?: number | null
          accepted_version_number?: number | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_version_number?: number
          customer_note?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          discount_cents?: number
          document_id?: string | null
          document_path?: string | null
          first_viewed_at?: string | null
          id?: string
          organization_id?: string
          privacy_version?: string | null
          project_id?: string | null
          quote_number?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["portal_quote_status"]
          subtotal_cents?: number
          terms_version?: string | null
          title?: string
          total_cents?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          vat_cents?: number
          version?: number
          withdraw_reason?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_quotes_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quotes_declined_by_fkey"
            columns: ["declined_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quotes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "portal_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quotes_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_quotes_withdrawn_by_fkey"
            columns: ["withdrawn_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_support_replies: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_support_replies_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_support_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "portal_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          organization_id: string
          priority: string
          project_id: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["portal_ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          organization_id: string
          priority?: string
          project_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["portal_ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          organization_id?: string
          priority?: string
          project_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["portal_ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_support_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portal_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addon_links: {
        Row: {
          addon_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          addon_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          addon_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_links_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "product_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addons: {
        Row: {
          audience_b2b: boolean
          audience_b2c: boolean
          billing_type: Database["public"]["Enums"]["billing_type"]
          created_at: string
          description: string
          description_nl: string | null
          id: string
          is_active: boolean
          name: string
          name_nl: string | null
          price_cents: number | null
          price_mode: Database["public"]["Enums"]["price_mode"]
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          audience_b2b?: boolean
          audience_b2c?: boolean
          billing_type?: Database["public"]["Enums"]["billing_type"]
          created_at?: string
          description?: string
          description_nl?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_nl?: string | null
          price_cents?: number | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          audience_b2b?: boolean
          audience_b2c?: boolean
          billing_type?: Database["public"]["Enums"]["billing_type"]
          created_at?: string
          description?: string
          description_nl?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_nl?: string | null
          price_cents?: number | null
          price_mode?: Database["public"]["Enums"]["price_mode"]
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          product_id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          product_id: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          product_id?: string
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_features: {
        Row: {
          created_at: string
          id: string
          included: boolean
          label: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          included?: boolean
          label: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          included?: boolean
          label?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_features_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text_en: string | null
          alt_text_nl: string | null
          byte_size: number
          created_at: string
          height: number | null
          id: string
          is_primary: boolean
          mime_type: string
          product_id: string
          sort_order: number
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text_en?: string | null
          alt_text_nl?: string | null
          byte_size: number
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          mime_type: string
          product_id: string
          sort_order?: number
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text_en?: string | null
          alt_text_nl?: string | null
          byte_size?: number
          created_at?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          mime_type?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          benefits: Json
          created_at: string
          cta_label: string | null
          delivery_time: string | null
          excluded_items: Json
          full_description: string
          id: string
          included_items: Json
          locale: string
          name: string
          product_id: string
          quote_cta_label: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string
          slug: string | null
          target_audience: string | null
          updated_at: string
          warnings: string | null
          workflow: string | null
        }
        Insert: {
          benefits?: Json
          created_at?: string
          cta_label?: string | null
          delivery_time?: string | null
          excluded_items?: Json
          full_description?: string
          id?: string
          included_items?: Json
          locale: string
          name?: string
          product_id: string
          quote_cta_label?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          slug?: string | null
          target_audience?: string | null
          updated_at?: string
          warnings?: string | null
          workflow?: string | null
        }
        Update: {
          benefits?: Json
          created_at?: string
          cta_label?: string | null
          delivery_time?: string | null
          excluded_items?: Json
          full_description?: string
          id?: string
          included_items?: Json
          locale?: string
          name?: string
          product_id?: string
          quote_cta_label?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          slug?: string | null
          target_audience?: string | null
          updated_at?: string
          warnings?: string | null
          workflow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          audience_b2b: boolean
          audience_b2c: boolean
          badge: string | null
          benefits: Json
          billing_type: Database["public"]["Enums"]["billing_type"]
          category_id: string | null
          compare_at_cents: number | null
          cost_cents: number | null
          created_at: string
          cta_label: string | null
          currency: string
          delivery_time: string | null
          excluded_items: Json | null
          extensions: Json | null
          featured: boolean
          from_price_cents: number | null
          full_description: string
          id: string
          included_items: Json | null
          internal_sku: string | null
          is_concept: boolean
          legal_approved_at: string | null
          legal_approved_by: string | null
          legal_internal_note: string | null
          legal_status: Database["public"]["Enums"]["legal_approval_status"]
          legal_terms_version: string | null
          name: string
          price_cents: number | null
          price_includes_vat: boolean
          price_label: string | null
          price_mode: Database["public"]["Enums"]["price_mode"] | null
          price_status: Database["public"]["Enums"]["price_approval_status"]
          primary_image_path: string | null
          publication_ready: boolean
          quote_cta_label: string | null
          required_input: Json | null
          seo_description: string | null
          seo_title: string | null
          short_description: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["product_status"]
          tags: Json
          target_audience: string | null
          updated_at: string
          updated_by: string | null
          vat_percent: number
          version: number
          warnings: string | null
          workflow: string | null
        }
        Insert: {
          audience_b2b?: boolean
          audience_b2c?: boolean
          badge?: string | null
          benefits?: Json
          billing_type?: Database["public"]["Enums"]["billing_type"]
          category_id?: string | null
          compare_at_cents?: number | null
          cost_cents?: number | null
          created_at?: string
          cta_label?: string | null
          currency?: string
          delivery_time?: string | null
          excluded_items?: Json | null
          extensions?: Json | null
          featured?: boolean
          from_price_cents?: number | null
          full_description: string
          id?: string
          included_items?: Json | null
          internal_sku?: string | null
          is_concept?: boolean
          legal_approved_at?: string | null
          legal_approved_by?: string | null
          legal_internal_note?: string | null
          legal_status?: Database["public"]["Enums"]["legal_approval_status"]
          legal_terms_version?: string | null
          name: string
          price_cents?: number | null
          price_includes_vat?: boolean
          price_label?: string | null
          price_mode?: Database["public"]["Enums"]["price_mode"] | null
          price_status?: Database["public"]["Enums"]["price_approval_status"]
          primary_image_path?: string | null
          publication_ready?: boolean
          quote_cta_label?: string | null
          required_input?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          short_description: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          tags?: Json
          target_audience?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_percent?: number
          version?: number
          warnings?: string | null
          workflow?: string | null
        }
        Update: {
          audience_b2b?: boolean
          audience_b2c?: boolean
          badge?: string | null
          benefits?: Json
          billing_type?: Database["public"]["Enums"]["billing_type"]
          category_id?: string | null
          compare_at_cents?: number | null
          cost_cents?: number | null
          created_at?: string
          cta_label?: string | null
          currency?: string
          delivery_time?: string | null
          excluded_items?: Json | null
          extensions?: Json | null
          featured?: boolean
          from_price_cents?: number | null
          full_description?: string
          id?: string
          included_items?: Json | null
          internal_sku?: string | null
          is_concept?: boolean
          legal_approved_at?: string | null
          legal_approved_by?: string | null
          legal_internal_note?: string | null
          legal_status?: Database["public"]["Enums"]["legal_approval_status"]
          legal_terms_version?: string | null
          name?: string
          price_cents?: number | null
          price_includes_vat?: boolean
          price_label?: string | null
          price_mode?: Database["public"]["Enums"]["price_mode"] | null
          price_status?: Database["public"]["Enums"]["price_approval_status"]
          primary_image_path?: string | null
          publication_ready?: boolean
          quote_cta_label?: string | null
          required_input?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          tags?: Json
          target_audience?: string | null
          updated_at?: string
          updated_by?: string | null
          vat_percent?: number
          version?: number
          warnings?: string | null
          workflow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_legal_approved_by_fkey"
            columns: ["legal_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          budget: string | null
          company: string | null
          created_at: string
          description: string
          email: string
          id: string
          locale: string
          name: string
          phone: string | null
          project_type: string
          status: Database["public"]["Enums"]["lead_status"]
          timeline: string | null
          updated_at: string
        }
        Insert: {
          budget?: string | null
          company?: string | null
          created_at?: string
          description: string
          email: string
          id?: string
          locale?: string
          name: string
          phone?: string | null
          project_type: string
          status?: Database["public"]["Enums"]["lead_status"]
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          budget?: string | null
          company?: string | null
          created_at?: string
          description?: string
          email?: string
          id?: string
          locale?: string
          name?: string
          phone?: string | null
          project_type?: string
          status?: Database["public"]["Enums"]["lead_status"]
          timeline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          count: number
          key: string
          reset_at: string
        }
        Insert: {
          count?: number
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          key?: string
          reset_at?: string
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
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string
          external_event_id: string
          id: string
          last_error: string | null
          payload: Json | null
          payment_id: string
          processed: boolean
          processed_at: string | null
          processing_status: string
          provider: string
        }
        Insert: {
          created_at?: string
          event_type: string
          external_event_id: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          payment_id: string
          processed?: boolean
          processed_at?: string | null
          processing_status?: string
          provider?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          external_event_id?: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          payment_id?: string
          processed?: boolean
          processed_at?: string | null
          processing_status?: string
          provider?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _partner_post_ledger: {
        Args: {
          p_actor: string
          p_currency: string
          p_entries: Json
          p_idempotency: string
          p_ref_id: string
          p_ref_type: string
          p_type: string
        }
        Returns: string
      }
      accept_portal_quote: {
        Args: {
          p_expected_version: number
          p_quote_id: string
          p_selected_optional_item_ids?: string[]
        }
        Returns: {
          detail: string
          ok: boolean
        }[]
      }
      apply_mollie_payment_update: {
        Args: {
          p_amount_cents: number
          p_event_type: string
          p_external_event_id: string
          p_order_id: string
          p_order_status: string
          p_payment_id: string
          p_payment_status: string
          p_provider_status: string
          p_release_delivery: boolean
          p_revoke_delivery: boolean
        }
        Returns: {
          already_processed: boolean
          order_status: string
        }[]
      }
      approve_partner_payout_request: {
        Args: {
          p_approve: boolean
          p_rejection_reason?: string
          p_request_id: string
        }
        Returns: string
      }
      can_reverse_invoice_payment: { Args: never; Returns: boolean }
      catalog_verify_admin_contracts: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          ok: boolean
        }[]
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      confirm_partner_sale: {
        Args: {
          p_currency?: string
          p_gross_amount_cents: number
          p_idempotency_key: string
          p_lead_id: string
          p_order_id?: string
          p_payment_id?: string
          p_rate_bps?: number
        }
        Returns: string
      }
      create_order_with_items: {
        Args: { p_items: Json; p_order: Json }
        Returns: undefined
      }
      create_partner_lead: {
        Args: {
          p_code?: string
          p_company?: string
          p_contact_email: string
          p_contact_name: string
          p_dedupe_key: string
          p_message?: string
          p_phone?: string
        }
        Returns: string
      }
      decline_portal_quote: {
        Args: {
          p_expected_version: number
          p_quote_id: string
          p_reason?: string
        }
        Returns: {
          detail: string
          ok: boolean
        }[]
      }
      generate_portal_document_number: { Args: never; Returns: string }
      generate_portal_invoice_number: {
        Args: { p_type?: Database["public"]["Enums"]["portal_invoice_type"] }
        Returns: string
      }
      generate_portal_project_number: { Args: never; Returns: string }
      generate_portal_quote_number: { Args: never; Returns: string }
      invoice_is_operationally_overdue: {
        Args: {
          p_amount_due: number
          p_due_date: string
          p_status: Database["public"]["Enums"]["portal_invoice_status"]
        }
        Returns: boolean
      }
      is_active_partner: { Args: never; Returns: boolean }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      is_staff_admin: { Args: never; Returns: boolean }
      issue_portal_invoice: {
        Args: { p_expected_version: number; p_invoice_id: string }
        Returns: {
          detail: string
          ok: boolean
        }[]
      }
      normalize_partner_code: { Args: { p_code: string }; Returns: string }
      p05_verify_payment_contracts: {
        Args: { p_run_behavioral?: boolean }
        Returns: {
          check_name: string
          detail: string
          ok: boolean
        }[]
      }
      partner_available_liability_cents: {
        Args: { p_partner_id: string }
        Returns: number
      }
      partner_financial_summary: {
        Args: { p_partner_id?: string }
        Returns: {
          approved_commission_cents: number
          available_cents: number
          paid_payout_cents: number
          partner_id: string
        }[]
      }
      partner_owns_profile: { Args: { p_partner_id: string }; Returns: boolean }
      portal_verify_customer_contracts: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          ok: boolean
        }[]
      }
      process_partner_refund_adjustment: {
        Args: {
          p_amount_cents: number
          p_currency?: string
          p_idempotency_key: string
          p_partner_id: string
          p_reason: string
          p_reference_id: string
          p_reference_type: string
          p_related_payout_id: string
        }
        Returns: string
      }
      quote_line_totals: {
        Args: {
          p_discount_cents: number
          p_quantity: number
          p_tax_bp: number
          p_unit_price_cents: number
        }
        Returns: {
          subtotal_cents: number
          tax_cents: number
          total_cents: number
        }[]
      }
      quote_tax_cents: {
        Args: { net_cents: number; tax_bp: number }
        Returns: number
      }
      recompute_portal_invoice_status_from_payments: {
        Args: {
          p_amount_paid_cents: number
          p_current_status: Database["public"]["Enums"]["portal_invoice_status"]
          p_due_date: string
          p_now?: string
          p_total_cents: number
        }
        Returns: Database["public"]["Enums"]["portal_invoice_status"]
      }
      record_partner_cash_receipt: {
        Args: {
          p_amount_cents: number
          p_currency?: string
          p_idempotency_key: string
          p_note?: string
          p_partner_id?: string
        }
        Returns: string
      }
      record_partner_payout_paid: {
        Args: {
          p_external_reference?: string
          p_idempotency_key?: string
          p_payout_id: string
        }
        Returns: string
      }
      record_portal_invoice_payment: {
        Args: {
          p_amount_cents: number
          p_currency: string
          p_expected_version: number
          p_external_reference?: string
          p_idempotency_key?: string
          p_internal_note?: string
          p_invoice_id: string
          p_payment_date: string
          p_payment_method: Database["public"]["Enums"]["portal_invoice_payment_method"]
        }
        Returns: {
          detail: string
          ok: boolean
        }[]
      }
      request_partner_payout: {
        Args: {
          p_amount_cents: number
          p_currency?: string
          p_idempotency_key: string
        }
        Returns: string
      }
      reverse_portal_invoice_payment: {
        Args: {
          p_correlation_id?: string
          p_expected_version: number
          p_invoice_id: string
          p_payment_record_id: string
          p_reversal_idempotency_key?: string
          p_reversal_reason: string
        }
        Returns: {
          amount_due_cents: number
          amount_paid_cents: number
          detail: string
          invoice_status: string
          ok: boolean
          payment_record_id: string
        }[]
      }
      review_partner_application: {
        Args: {
          p_application_id: string
          p_approve: boolean
          p_partner_code?: string
          p_rejection_reason?: string
        }
        Returns: string
      }
      review_partner_lead: {
        Args: {
          p_lead_id: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["partner_lead_status"]
        }
        Returns: string
      }
      submit_partner_application: {
        Args: {
          p_contact_email: string
          p_kvk?: string
          p_legal_name: string
          p_phone?: string
          p_trade_name: string
          p_vat?: string
        }
        Returns: string
      }
      verify_auth_portal_foundation_contracts: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          ok: boolean
        }[]
      }
      verify_documents_storage_contracts: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          ok: boolean
        }[]
      }
      verify_invoices_financial_contracts: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          ok: boolean
        }[]
      }
      verify_partner_admin_contracts: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          ok: boolean
        }[]
      }
      verify_project_management_contracts: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          ok: boolean
        }[]
      }
      verify_quotes_acceptance_contracts: {
        Args: never
        Returns: {
          check_name: string
          detail: string
          ok: boolean
        }[]
      }
    }
    Enums: {
      admin_role: "OWNER" | "ADMIN" | "SUPPORT" | "CONTENT"
      billing_type: "ONE_TIME" | "MONTHLY" | "YEARLY" | "QUOTE_ONLY" | "FREE"
      customer_org_role: "PRIMARY" | "MEMBER" | "BILLING" | "VIEW_ONLY"
      lead_status: "NEW" | "IN_PROGRESS" | "CLOSED"
      lead_type: "CONTACT" | "QUOTE" | "SUPPORT"
      legal_approval_status:
        | "NOT_REVIEWED"
        | "INTERNAL_REVIEW"
        | "LEGAL_REVIEW_REQUIRED"
        | "APPROVED_FOR_B2B"
        | "APPROVED_FOR_B2C"
        | "APPROVED_FOR_BOTH"
      order_status:
        | "PENDING"
        | "PAID"
        | "FAILED"
        | "CANCELLED"
        | "REFUNDED"
        | "QUOTE_REQUESTED"
      org_member_status: "INVITED" | "ACTIVE" | "REMOVED"
      organization_status: "ACTIVE" | "INVITED" | "BLOCKED" | "ARCHIVED"
      organization_type: "BUSINESS" | "CONSUMER"
      partner_application_status:
        | "DRAFT"
        | "SUBMITTED"
        | "IN_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "WITHDRAWN"
      partner_code_status: "ACTIVE" | "REVOKED" | "EXPIRED"
      partner_commission_status:
        | "PENDING"
        | "ELIGIBLE"
        | "APPROVED"
        | "PAID"
        | "REVERSED"
        | "ADJUSTED"
      partner_lead_status:
        | "NEW"
        | "IN_REVIEW"
        | "ASSIGNED"
        | "CONVERTED"
        | "REJECTED"
        | "CLOSED"
      partner_ledger_account:
        | "COMMISSION_LIABILITY"
        | "PAYOUT_CLEARING"
        | "CASH"
        | "ADJUSTMENT"
        | "REVENUE_CLEARING"
      partner_payout_request_status:
        | "REQUESTED"
        | "APPROVED"
        | "REJECTED"
        | "CANCELLED"
      partner_payout_status: "PENDING" | "PAID" | "FAILED" | "CANCELLED"
      partner_profile_status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED"
      partner_sale_status:
        | "PENDING"
        | "CONFIRMED"
        | "SETTLED"
        | "CANCELLED"
        | "REVERSED"
      payment_status:
        | "OPEN"
        | "PENDING"
        | "PAID"
        | "FAILED"
        | "CANCELLED"
        | "EXPIRED"
        | "AUTHORIZED"
        | "REFUNDED"
        | "CHARGED_BACK"
      portal_action_assignee: "INTERNAL" | "CUSTOMER" | "UNASSIGNED"
      portal_action_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "WAITING"
        | "COMPLETED"
        | "CANCELED"
      portal_activity_visibility: "INTERNAL" | "CUSTOMER_VISIBLE"
      portal_document_category:
        | "GENERAL"
        | "PROJECT_FILE"
        | "DELIVERABLE"
        | "QUOTE"
        | "INVOICE"
        | "CONTRACT"
        | "BRIEFING"
        | "DESIGN"
        | "CONTENT"
        | "REPORT"
        | "SUPPORT_ATTACHMENT"
        | "OTHER"
      portal_document_scan_status:
        | "NOT_REQUIRED"
        | "PENDING"
        | "CLEAN"
        | "SUSPICIOUS"
        | "INFECTED"
        | "FAILED"
      portal_document_status:
        | "UPLOADING"
        | "AVAILABLE"
        | "QUARANTINED"
        | "REJECTED"
        | "ARCHIVED"
        | "DELETED"
      portal_document_visibility:
        | "INTERNAL"
        | "CUSTOMER_VISIBLE"
        | "CUSTOMER_UPLOAD"
        | "RESTRICTED"
      portal_invite_status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
      portal_invoice_item_type:
        | "SERVICE"
        | "PRODUCT"
        | "ADDON"
        | "DISCOUNT"
        | "CUSTOM"
        | "CREDIT"
      portal_invoice_payment_method:
        | "BANK_TRANSFER"
        | "CASH"
        | "CARD_EXTERNAL"
        | "ACCOUNTING_IMPORT"
        | "OTHER"
      portal_invoice_status:
        | "DRAFT"
        | "OPEN"
        | "PAID"
        | "OVERDUE"
        | "CANCELED"
        | "CREDITED"
        | "IN_REVIEW"
        | "READY"
        | "ISSUED"
        | "PARTIALLY_PAID"
        | "ARCHIVED"
      portal_invoice_type: "INVOICE" | "CREDIT_NOTE" | "PROFORMA"
      portal_milestone_status:
        | "NOT_STARTED"
        | "IN_PROGRESS"
        | "WAITING_FOR_CUSTOMER"
        | "COMPLETED"
        | "SKIPPED"
      portal_project_member_role:
        | "PROJECT_MANAGER"
        | "DEVELOPER"
        | "DESIGNER"
        | "CONTENT_EDITOR"
        | "SUPPORT"
        | "VIEWER"
      portal_project_status:
        | "DRAFT"
        | "PLANNED"
        | "IN_PROGRESS"
        | "WAITING_FOR_CUSTOMER"
        | "REVIEW"
        | "COMPLETED"
        | "ON_HOLD"
        | "CANCELED"
        | "ARCHIVED"
      portal_project_type:
        | "WEBSITE"
        | "WEBSHOP"
        | "SOFTWARE"
        | "OPTIMISATION"
        | "MAINTENANCE"
        | "BRANDING"
        | "INTEGRATION"
        | "SUPPORT"
        | "OTHER"
      portal_quote_item_type:
        | "SERVICE"
        | "PRODUCT"
        | "ADDON"
        | "DISCOUNT"
        | "CUSTOM"
      portal_quote_status:
        | "DRAFT"
        | "SENT"
        | "VIEWED"
        | "ACCEPTED"
        | "DECLINED"
        | "EXPIRED"
        | "WITHDRAWN"
        | "IN_REVIEW"
        | "READY"
        | "SUPERSEDED"
        | "ARCHIVED"
      portal_ticket_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "WAITING_FOR_CUSTOMER"
        | "WAITING_FOR_VDB"
        | "RESOLVED"
        | "CLOSED"
      price_approval_status:
        | "DRAFT"
        | "INTERNAL_REVIEW"
        | "APPROVED"
        | "PUBLISHED"
        | "ARCHIVED"
      price_mode: "FIXED" | "STARTING_FROM" | "QUOTE_ONLY"
      product_status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "REVIEW" | "HIDDEN"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_role: ["OWNER", "ADMIN", "SUPPORT", "CONTENT"],
      billing_type: ["ONE_TIME", "MONTHLY", "YEARLY", "QUOTE_ONLY", "FREE"],
      customer_org_role: ["PRIMARY", "MEMBER", "BILLING", "VIEW_ONLY"],
      lead_status: ["NEW", "IN_PROGRESS", "CLOSED"],
      lead_type: ["CONTACT", "QUOTE", "SUPPORT"],
      legal_approval_status: [
        "NOT_REVIEWED",
        "INTERNAL_REVIEW",
        "LEGAL_REVIEW_REQUIRED",
        "APPROVED_FOR_B2B",
        "APPROVED_FOR_B2C",
        "APPROVED_FOR_BOTH",
      ],
      order_status: [
        "PENDING",
        "PAID",
        "FAILED",
        "CANCELLED",
        "REFUNDED",
        "QUOTE_REQUESTED",
      ],
      org_member_status: ["INVITED", "ACTIVE", "REMOVED"],
      organization_status: ["ACTIVE", "INVITED", "BLOCKED", "ARCHIVED"],
      organization_type: ["BUSINESS", "CONSUMER"],
      partner_application_status: [
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "APPROVED",
        "REJECTED",
        "WITHDRAWN",
      ],
      partner_code_status: ["ACTIVE", "REVOKED", "EXPIRED"],
      partner_commission_status: [
        "PENDING",
        "ELIGIBLE",
        "APPROVED",
        "PAID",
        "REVERSED",
        "ADJUSTED",
      ],
      partner_lead_status: [
        "NEW",
        "IN_REVIEW",
        "ASSIGNED",
        "CONVERTED",
        "REJECTED",
        "CLOSED",
      ],
      partner_ledger_account: [
        "COMMISSION_LIABILITY",
        "PAYOUT_CLEARING",
        "CASH",
        "ADJUSTMENT",
        "REVENUE_CLEARING",
      ],
      partner_payout_request_status: [
        "REQUESTED",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ],
      partner_payout_status: ["PENDING", "PAID", "FAILED", "CANCELLED"],
      partner_profile_status: ["PENDING", "ACTIVE", "SUSPENDED", "REVOKED"],
      partner_sale_status: [
        "PENDING",
        "CONFIRMED",
        "SETTLED",
        "CANCELLED",
        "REVERSED",
      ],
      payment_status: [
        "OPEN",
        "PENDING",
        "PAID",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
        "AUTHORIZED",
        "REFUNDED",
        "CHARGED_BACK",
      ],
      portal_action_assignee: ["INTERNAL", "CUSTOMER", "UNASSIGNED"],
      portal_action_status: [
        "OPEN",
        "IN_PROGRESS",
        "WAITING",
        "COMPLETED",
        "CANCELED",
      ],
      portal_activity_visibility: ["INTERNAL", "CUSTOMER_VISIBLE"],
      portal_document_category: [
        "GENERAL",
        "PROJECT_FILE",
        "DELIVERABLE",
        "QUOTE",
        "INVOICE",
        "CONTRACT",
        "BRIEFING",
        "DESIGN",
        "CONTENT",
        "REPORT",
        "SUPPORT_ATTACHMENT",
        "OTHER",
      ],
      portal_document_scan_status: [
        "NOT_REQUIRED",
        "PENDING",
        "CLEAN",
        "SUSPICIOUS",
        "INFECTED",
        "FAILED",
      ],
      portal_document_status: [
        "UPLOADING",
        "AVAILABLE",
        "QUARANTINED",
        "REJECTED",
        "ARCHIVED",
        "DELETED",
      ],
      portal_document_visibility: [
        "INTERNAL",
        "CUSTOMER_VISIBLE",
        "CUSTOMER_UPLOAD",
        "RESTRICTED",
      ],
      portal_invite_status: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"],
      portal_invoice_item_type: [
        "SERVICE",
        "PRODUCT",
        "ADDON",
        "DISCOUNT",
        "CUSTOM",
        "CREDIT",
      ],
      portal_invoice_payment_method: [
        "BANK_TRANSFER",
        "CASH",
        "CARD_EXTERNAL",
        "ACCOUNTING_IMPORT",
        "OTHER",
      ],
      portal_invoice_status: [
        "DRAFT",
        "OPEN",
        "PAID",
        "OVERDUE",
        "CANCELED",
        "CREDITED",
        "IN_REVIEW",
        "READY",
        "ISSUED",
        "PARTIALLY_PAID",
        "ARCHIVED",
      ],
      portal_invoice_type: ["INVOICE", "CREDIT_NOTE", "PROFORMA"],
      portal_milestone_status: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "WAITING_FOR_CUSTOMER",
        "COMPLETED",
        "SKIPPED",
      ],
      portal_project_member_role: [
        "PROJECT_MANAGER",
        "DEVELOPER",
        "DESIGNER",
        "CONTENT_EDITOR",
        "SUPPORT",
        "VIEWER",
      ],
      portal_project_status: [
        "DRAFT",
        "PLANNED",
        "IN_PROGRESS",
        "WAITING_FOR_CUSTOMER",
        "REVIEW",
        "COMPLETED",
        "ON_HOLD",
        "CANCELED",
        "ARCHIVED",
      ],
      portal_project_type: [
        "WEBSITE",
        "WEBSHOP",
        "SOFTWARE",
        "OPTIMISATION",
        "MAINTENANCE",
        "BRANDING",
        "INTEGRATION",
        "SUPPORT",
        "OTHER",
      ],
      portal_quote_item_type: [
        "SERVICE",
        "PRODUCT",
        "ADDON",
        "DISCOUNT",
        "CUSTOM",
      ],
      portal_quote_status: [
        "DRAFT",
        "SENT",
        "VIEWED",
        "ACCEPTED",
        "DECLINED",
        "EXPIRED",
        "WITHDRAWN",
        "IN_REVIEW",
        "READY",
        "SUPERSEDED",
        "ARCHIVED",
      ],
      portal_ticket_status: [
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_CUSTOMER",
        "WAITING_FOR_VDB",
        "RESOLVED",
        "CLOSED",
      ],
      price_approval_status: [
        "DRAFT",
        "INTERNAL_REVIEW",
        "APPROVED",
        "PUBLISHED",
        "ARCHIVED",
      ],
      price_mode: ["FIXED", "STARTING_FROM", "QUOTE_ONLY"],
      product_status: ["DRAFT", "PUBLISHED", "ARCHIVED", "REVIEW", "HIDDEN"],
    },
  },
} as const
