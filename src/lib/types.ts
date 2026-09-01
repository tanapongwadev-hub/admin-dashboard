export type UserRole = "Owner" | "Admin" | "Editor" | "Viewer";
export type UserStatus = "Active" | "Invited" | "Suspended";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarColor: string;
  lastActive: string;
  joined: string;
}

export type ProductStatus = "In stock" | "Low stock" | "Out of stock" | "Draft";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  sales: number;
  updated: string;
}

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

export interface Order {
  id: string;
  customer: string;
  email: string;
  date: string;
  amount: number;
  items: number;
  status: OrderStatus;
  payment: "Paid" | "Refunded" | "Failed";
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  avatarColor: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning" | "danger";
}
