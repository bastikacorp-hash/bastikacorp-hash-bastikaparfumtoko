export type UserRole = "admin" | "client";

export interface UserProfile {
  email: string;
  role: UserRole;
  addedAt: string;
  password?: string;
  username?: string;
}

export interface Shelf {
  id: string;
  rackNumber: string;
  scentName: string;
  pricePerMl: number;
}

export interface ScentPrice {
  scentName: string;
  pricePerMl: number;
  updatedAt: string;
}

export interface StockItem {
  id: string;
  type: "essence" | "alcohol" | "bottle";
  scentName?: string;
  size?: string; // For bottles (e.g. "30ml", "50ml", "100ml")
  quantity: number; // in ml or units
}

export interface Transaction {
  id: string;
  type: "purchase" | "sale";
  date: string; // ISO String or local Date string
  category: "bibit" | "alkohol" | "botol" | "other";
  scentName?: string; // If bibit/essence is selected
  volumeMl?: number; // Volume of bibit
  bottleSize?: string; // "None" or size (e.g. "30ml", "50ml", "100ml")
  bottleCount?: number; // Quantity of bottles
  totalPrice: number;
  description: string;
  operatorEmail: string;
}

export interface Salary {
  id: string;
  employeeName: string;
  amount: number;
  month: string; // e.g. "July 2026"
  datePaid: string;
  notes: string;
}

export interface CashMutation {
  id: string;
  date: string;
  type: "in" | "out";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
}
