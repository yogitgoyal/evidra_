import {
  User,
  Phone,
  Smartphone,
  Cpu,
  Globe,
  Landmark,
  Wallet,
  RadioTower,
  MapPin,
  AtSign,
  type LucideIcon,
} from "lucide-react";
import { EntityType } from "@/lib/types";

export const entityIconMap: Record<EntityType, LucideIcon> = {
  person: User,
  phone: Phone,
  sim: Smartphone,
  device: Cpu,
  ip: Globe,
  account: Landmark,
  upi: Wallet,
  tower: RadioTower,
  location: MapPin,
  social: AtSign,
};

export const entityColorMap: Record<EntityType, string> = {
  person: "#2f5fe0",
  phone: "#7c53e0",
  sim: "#7c53e0",
  device: "#d97a06",
  ip: "#d97a06",
  account: "#16874f",
  upi: "#16874f",
  tower: "#5b616e",
  location: "#5b616e",
  social: "#dc3d43",
};

export const entityTypeLabel: Record<EntityType, string> = {
  person: "Person",
  phone: "Phone",
  sim: "SIM",
  device: "Device",
  ip: "IP Address",
  account: "Bank Account",
  upi: "UPI ID",
  tower: "Tower",
  location: "Location",
  social: "Social",
};

export function EntityIcon({ type, size = 14, className }: { type: EntityType; size?: number; className?: string }) {
  const Icon = entityIconMap[type];
  return <Icon size={size} className={className} style={{ color: entityColorMap[type] }} />;
}
