// src/types.ts

export interface JwtUser {
  user_id: number;
  role: "admin" | "user";
  email: string;
  subscription_plan: "free" | "premium" | "monthly" | "yearly";
  subscription_status: "active" | "inactive" | "cancelled";
}

export interface SignalRow {
  signal_id: number;
  title: string;
  body: string;
  asset_type: string;
  symbol: string;
  visibility: "public" | "premium" | "private";
  status: "active" | "scheduled" | "cancelled";
  metadata: any | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  author_id: number;
}

// Payload sent to WebSocket clients when a new signal is published
export interface SignalPayload {
  signal_id: number;
  title: string;
  body: string;
  asset_type: string;
  symbol: string;
  visibility: string;
  status: string;
  metadata: any;
  scheduled_at: string | null;
  created_at: string;
  author_id: number;
}
