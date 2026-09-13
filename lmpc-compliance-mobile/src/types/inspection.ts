import { User } from "./auth";

export type InspectionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type ComplianceStatus = "COMPLIANT" | "NON_COMPLIANT" | "NEEDS_REVIEW";
export type NoticeStatus = "DRAFT" | "ISSUED" | "CANCELLED";

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface ExtractedData {
  mrp_val: number | null;
  unit_symbol: string | null;
  net_quantity?: string | null;
  mfg_date: string | null;
  country_origin: string | null;
  manufacturer_name?: string | null;
  commodity_name?: string | null;
  [key: string]: any;
}

export interface InspectionLocation {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface ViolationRule {
  rule: string;
  description: string;
}

export interface PanelImage {
  imageUrl: string;
  cloudinaryPublicId?: string;
  panelLabel?: string | null;
  panel?: string | null;
}

export interface Inspection {
  _id: string;
  inspector: User | string;
  imageUrl: string;
  cloudinaryPublicId?: string;
  multiImages?: PanelImage[];
  location: InspectionLocation;
  status: InspectionStatus;
  extractedData: ExtractedData;
  complianceStatus: ComplianceStatus;
  violations?: ViolationRule[];
  boundingBoxes: BoundingBox[];
  failureReason: string | null;
  evidenceHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ViolationRule {
  rule: string;
  description: string;
}

export interface Notice {
  _id: string;
  noticeNumber: string;
  inspection: Inspection | string;
  issuedBy: User | string;
  pdfUrl: string | null;
  cloudinaryPublicId: string | null;
  violations: ViolationRule[];
  status: NoticeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionStatsSummary {
  total: number;
  byStatus: {
    PENDING: number;
    PROCESSING: number;
    COMPLETED: number;
    FAILED: number;
  };
  byCompliance: {
    COMPLIANT: number;
    NON_COMPLIANT: number;
    NEEDS_REVIEW: number;
  };
}

export interface ComplianceRateData {
  total: number;
  compliant: number;
  nonCompliant: number;
  needsReview: number;
  complianceRate: number;
}
