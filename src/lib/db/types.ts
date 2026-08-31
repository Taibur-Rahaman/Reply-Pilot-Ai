/** Multi-tenant ReplyPilot AI store types (PRD F25 + FaceTai 2.0 legacy codename). */

export type CrmStage =
  | "new"
  | "interested"
  | "negotiating"
  | "won"
  | "lost";

export type TeamRole = "admin" | "manager" | "moderator" | "agent";

export type OrderTrackingStatus =
  | "new"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "unknown";

export type PageConnectMode = "env" | "oauth" | "demo";

export type Channel =
  | "messenger"
  | "instagram"
  | "whatsapp"
  | "web"
  | "telegram";

export type ComplaintPriority = "low" | "medium" | "high" | "urgent";

export type ComplaintStatus =
  | "open"
  | "escalated"
  | "refund_pending"
  | "exchange_pending"
  | "resolved"
  | "closed";

export type ComplaintResolution = "none" | "refund" | "exchange" | "apology";

export type EcommercePlatform =
  | "woocommerce"
  | "shopify"
  | "wordpress"
  | "opencart"
  | "manual";

export type KbSource =
  | "manual"
  | "pdf"
  | "excel"
  | "docx"
  | "crawl"
  | "facebook_faq"
  | "google_drive"
  | "google_sheets"
  | "notion";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  disabled?: boolean;
  createdAt: string;
};

export type User = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: TeamRole;
  /** bcrypt hash — never return to clients. */
  passwordHash: string;
  createdAt: string;
};

export type GuardrailRules = {
  neverInventStock: boolean;
  collectPhone: boolean;
  confirmOrder: boolean;
  escalateRefund: boolean;
  escalateLegal: boolean;
  escalateAngry: boolean;
  escalateLowConfidence: boolean;
  /** 0–1; default 0.7 */
  confidenceThreshold: number;
};

export const DEFAULT_GUARDRAIL_RULES: GuardrailRules = {
  neverInventStock: true,
  collectPhone: true,
  confirmOrder: true,
  escalateRefund: true,
  escalateLegal: true,
  escalateAngry: true,
  escalateLowConfidence: true,
  confidenceThreshold: 0.7,
};

export type AuditLog = {
  id: string;
  tenantId: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type TimelineEventType =
  | "message"
  | "order"
  | "complaint"
  | "note"
  | "handoff"
  | "lead";

export type TimelineEvent = {
  id: string;
  tenantId: string;
  senderId?: string;
  leadId?: string;
  type: TimelineEventType;
  title: string;
  body?: string;
  refId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type KbChunk = {
  id: string;
  tenantId: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  createdAt: string;
};

export type PageConnection = {
  id: string;
  tenantId: string;
  pageId: string;
  pageName: string;
  /** Never log; demo/oauth tokens stored locally only. */
  accessToken?: string;
  status: "pending" | "active" | "error" | "disconnected";
  mode: PageConnectMode;
  permissionsOk: boolean;
  webhookSubscribed: boolean;
  lastError?: string;
  connectedAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  tenantId: string;
  pageId: string;
  senderId: string;
  senderName?: string;
  /** Omnichannel — defaults to messenger for legacy rows. */
  channel: Channel;
  handoffActive: boolean;
  assignedUserId?: string;
  priority?: ComplaintPriority;
  complaintTagged?: boolean;
  lastMessageAt: string;
  createdAt: string;
};

export type ProductRecognitionMeta = {
  productId?: string;
  productName?: string;
  confidence?: number;
  similarIds?: string[];
  method?: "heuristic" | "vision" | "none";
};

export type Message = {
  id: string;
  tenantId: string;
  conversationId: string;
  direction: "inbound" | "outbound" | "system";
  text: string;
  mid?: string;
  imageUrl?: string;
  recognition?: ProductRecognitionMeta;
  createdAt: string;
};

export type Lead = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  businessType: string;
  interest: string;
  source: string;
  crmStage: CrmStage;
  notes?: string;
  senderId?: string;
  followUpQueuedAt?: string;
  followUpSentAt?: string;
  priority?: ComplaintPriority;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  tenantId: string;
  pageId?: string;
  senderId: string;
  name: string;
  phone: string;
  product: string;
  qty: string;
  notes?: string;
  status: string;
  trackingStatus: OrderTrackingStatus;
  courierNote?: string;
  courierName?: string;
  trackingNumber?: string;
  address?: string;
  unitPrice?: number;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  tenantId: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  active: boolean;
  size?: string;
  color?: string;
  category?: string;
  /** Product IDs this item is an upsell for. */
  upsellOf?: string[];
  /** Product IDs this item is a cross-sell for. */
  crossSellOf?: string[];
  /** Bundle partner product IDs. */
  bundleWith?: string[];
  sku?: string;
  externalId?: string;
  sourcePlatform?: EcommercePlatform;
  createdAt: string;
  updatedAt: string;
};

export type KbDocument = {
  id: string;
  tenantId: string;
  filename: string;
  mimeType: string;
  source: KbSource;
  extractedText: string;
  /** Relative path under data/uploads when stored on disk. */
  storagePath?: string;
  status: "ready" | "pending" | "stub" | "error";
  note?: string;
  createdAt: string;
};

export type FaqItem = {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  updatedAt: string;
};

export type BotConfig = {
  tenantId: string;
  pageId: string;
  businessName: string;
  greeting: string;
  systemPrompt: string;
  productFaq: string;
  productImageUrl: string;
  handoffEnabled: boolean;
  abandonedLeadHours: number;
  personality: string;
  guardrailRules: GuardrailRules;
  botEnabled: boolean;
  updatedAt: string;
};

export type Complaint = {
  id: string;
  tenantId: string;
  conversationId?: string;
  leadId?: string;
  senderId?: string;
  channel?: Channel;
  text: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  resolution: ComplaintResolution;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type EcommerceConnection = {
  id: string;
  tenantId: string;
  platform: EcommercePlatform;
  storeUrl: string;
  apiKey?: string;
  status: "disconnected" | "connected" | "error" | "stub";
  lastSyncAt?: string;
  lastError?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentSettings = {
  tenantId: string;
  autoReplyEnabled: boolean;
  autoReplyText: string;
  spamKeywords: string[];
  leadCaptureEnabled: boolean;
  updatedAt: string;
};

export type CommentEvent = {
  id: string;
  tenantId: string;
  commentId: string;
  postId?: string;
  authorName?: string;
  text: string;
  isSpam: boolean;
  spamAction?: "flagged" | "deleted_stub";
  autoReplied: boolean;
  replyText?: string;
  leadId?: string;
  createdAt: string;
};

/** Legacy JSON dump shape — used only by migrate script. */
export type FaceTaiDb = {
  version: 1 | 2;
  tenants: Tenant[];
  users: Array<Omit<User, "passwordHash"> & { password?: string; passwordHash?: string }>;
  pages: PageConnection[];
  conversations: Conversation[];
  messages: Message[];
  leads: Lead[];
  orders: Order[];
  products: Product[];
  kbDocuments: KbDocument[];
  faqItems: FaqItem[];
  botConfigs: BotConfig[];
  complaints: Complaint[];
  ecommerceConnections: EcommerceConnection[];
  commentSettings: CommentSettings[];
  commentEvents: CommentEvent[];
};

export const CRM_STAGES: CrmStage[] = [
  "new",
  "interested",
  "negotiating",
  "won",
  "lost",
];

export const TEAM_ROLES: TeamRole[] = [
  "admin",
  "manager",
  "moderator",
  "agent",
];

export const TRACKING_STATUSES: OrderTrackingStatus[] = [
  "new",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "unknown",
];

export const CHANNELS: Channel[] = [
  "messenger",
  "instagram",
  "whatsapp",
  "web",
  "telegram",
];

export const COMPLAINT_PRIORITIES: ComplaintPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const COMPLAINT_STATUSES: ComplaintStatus[] = [
  "open",
  "escalated",
  "refund_pending",
  "exchange_pending",
  "resolved",
  "closed",
];

export const ECOMMERCE_PLATFORMS: EcommercePlatform[] = [
  "woocommerce",
  "shopify",
  "wordpress",
  "opencart",
  "manual",
];

export const DEFAULT_TENANT_ID = "tenant_demo";
export const DEFAULT_TENANT_SLUG = "demo";
