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
  discountType?: "none" | "free_bottle" | "nominal";
  discountNominal?: number;
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

export interface BottleSize {
  id: string;
  size: string;
  price: number;
  addedAt: string;
}

export interface InvoiceSettings {
  storeName: string;
  slogan: string;
  address: string;
  phone: string;
  headerMessage: string;
  footerMessage1: string;
  footerMessage2: string;
  paperWidth: "58mm" | "80mm";
  logoUrl: string;
  showLogo: boolean;
  appIconUrl?: string;
}

