import type { BrandTextCasing } from "@/lib/brand-text-casing";

export type { BrandTextCasing, TextCasingRule } from "@/lib/brand-text-casing";

export type MemberRole =
  | "admin"
  | "creator"
  | "community_manager"
  | "designer"
  | "client";
export type PostFormat = "feed" | "carousel" | "reel" | "story" | "image" | "video_carousel";
export type PostStatus =
  | "draft"
  | "brief_ready"
  | "in_design"
  | "ajustes"
  | "review"
  | "approved"
  | "scheduled"
  | "published";
export type InvitationStatus = "pending" | "accepted" | "expired";
export type TaskStatus =
  | "contenido"
  | "brief_listo"
  | "en_revision"
  | "ajustes"
  | "aprobado";
export type NotificationType = "mention" | "assignment" | "status_change" | "comment";

export interface Profile {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  invite_token: string;
  default_invite_role: MemberRole;
  post_formats?: PostFormat[];
  client_name?: string | null;
  client_email?: string | null;
  identifier_label?: string | null;
  identifier_allow_photo?: boolean;
  identifier_placeholder?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgRoleSlot {
  id: string;
  organization_id: string;
  role: MemberRole;
  label: string | null;
  sort_order: number;
  created_at: string;
}

export interface OrgRoleSlotInput {
  role: MemberRole;
  label?: string;
}

export interface OrgPillarInput {
  name: string;
  color: string;
  target_pct: number;
}

export interface CreateOrganizationInput {
  name: string;
  roleSlots?: OrgRoleSlotInput[];
  pillars: OrgPillarInput[];
  postFormats: PostFormat[];
  clientName?: string;
  clientEmail?: string;
  toneOfVoice?: string;
  objective?: string;
  colors?: string[];
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  extra_roles?: MemberRole[];
  joined_at: string;
  profile?: Profile;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: MemberRole;
  invited_by: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

export interface BrandKit {
  id: string;
  organization_id: string;
  name: string;
  logo_url: string | null;
  colors: string[];
  fonts: { heading: string; body: string };
  tone_of_voice: string | null;
  guidelines: string | null;
  objective: string | null;
  kit_file_url: string | null;
  text_casing?: BrandTextCasing | null;
  created_at: string;
  updated_at: string;
}

export interface OrgIdentifier {
  id: string;
  organization_id: string;
  value: string;
  photo_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrgAssetLink {
  id: string;
  organization_id: string;
  category: string;
  label: string;
  url: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BriefColorRef {
  hex: string;
  name?: string;
  role?: string;
}

export interface DesignBriefSlide {
  slide: number;
  focus?: string;
  format_label?: string;
  visual_concept?: string;
  text_instructions?: string;
  image_treatment?: string;
  layout?: string;
  colors_used?: BriefColorRef[];
  /** Campos legacy — briefs anteriores */
  title?: string;
  subtitle?: string;
  body?: string;
  image_prompt?: string;
  colors?: string[];
  typography?: { heading: string; body: string };
}

export interface DesignBrief {
  format: PostFormat;
  execution_title?: string;
  brand_kit_configured?: boolean;
  brand_palette?: {
    colors: BriefColorRef[];
    fonts: { heading: string; body: string };
  };
  slides: DesignBriefSlide[];
  strategic_note?: string;
  notes?: string;
  instructions?: string;
  generated_at: string;
}

export interface BriefHistoryEntry extends DesignBrief {
  archived_at: string;
}

export interface ContentPillar {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  target_pct: number;
  sort_order: number;
  created_at: string;
}

export interface OrgHashtagGroup {
  id: string;
  organization_id: string;
  category: string;
  tags: string[];
  sort_order: number;
  created_at: string;
}

export interface PostMetrics {
  id: string;
  post_id: string;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  recorded_at: string;
  recorded_by: string;
  created_at: string;
}

export interface Post {
  id: string;
  organization_id: string;
  title: string;
  scheduled_at: string | null;
  format: PostFormat;
  pillar: string | null;
  copy: string | null;
  caption: string | null;
  plate: string | null;
  org_identifier_id: string | null;
  identifier_photo_url: string | null;
  in_drive: boolean;
  published: boolean;
  references_text: string | null;
  objective: string | null;
  cta: string | null;
  status: PostStatus;
  brief: DesignBrief | null;
  brief_history?: BriefHistoryEntry[];
  created_by: string;
  assigned_to: string | null;
  community_manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostAsset {
  id: string;
  post_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  sort_order: number;
  uploaded_by: string;
  created_at: string;
}

export type PostWithAssets = Post & {
  assets: PostAsset[];
  creator_name?: string | null;
  designer_name?: string | null;
  community_name?: string | null;
};

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string;
  status: TaskStatus;
  due_at: string | null;
  post_id: string | null;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  post?: Post;
}

export interface PostComment {
  id: string;
  post_id: string;
  organization_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar_url?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  related_post_id: string | null;
  created_at: string;
  organization?: Organization;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  contenido: "Contenido",
  brief_listo: "Brief listo",
  en_revision: "En revisión",
  ajustes: "Ajustes",
  aprobado: "Aprobado",
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Admin",
  creator: "Creadora",
  community_manager: "Community Manager",
  designer: "Diseñador",
  client: "Cliente",
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Contenido",
  brief_ready: "Brief listo",
  in_design: "Ajustes",
  ajustes: "Ajustes",
  review: "En revisión",
  approved: "Aprobado",
  scheduled: "Aprobado",
  published: "Aprobado",
};

export const FORMAT_LABELS: Record<PostFormat, string> = {
  feed: "Feed",
  image: "Imagen",
  carousel: "Carrusel",
  video_carousel: "Video carrusel",
  reel: "Reel",
  story: "Story",
};

export const PILLAR_OPTIONS = [
  "Valor",
  "Ventas",
  "Información",
  "Informativo",
] as const;

export interface BulkPostInput {
  title: string;
  scheduled_at: string;
  format: string;
  pillar?: string;
  copy?: string;
  caption?: string;
  plate?: string;
  org_identifier_id?: string;
  identifier_photo_url?: string;
  in_drive?: boolean;
  references_text?: string;
}
