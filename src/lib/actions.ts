"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { MAX_SLOT_WIDGETS } from "@/lib/widget-config";
import { PILLAR_DEFAULTS } from "@/lib/pillar-colors";
import type { CreateOrganizationInput, MemberRole, PostFormat, BulkPostInput } from "@/lib/types";
import type { GrillaDraftPayload } from "@/lib/grilla-draft";
import type { GrillaPeriod } from "@/lib/grilla-slot-utils";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  first_name: string;
  last_name: string;
  phone?: string;
  job_title?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const full_name = `${data.first_name} ${data.last_name}`.trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      full_name,
      phone: data.phone || null,
      job_title: data.job_title || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function joinOrgByInviteToken(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase.rpc("join_org_by_invite_token", {
    invite: token,
  });

  if (error) return { error: error.message };

  revalidatePath("/home");
  return { data: data as string };
}

export async function createOrganization(input: CreateOrganizationInput | string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const payload: CreateOrganizationInput =
    typeof input === "string" ? { name: input, pillars: [], postFormats: ["image", "carousel", "reel", "story"] } : input;

  const name = payload.name.trim();
  if (!name) return { error: "Nombre requerido" };

  const slug = slugify(name) + "-" + Date.now().toString(36);
  const postFormats =
    payload.postFormats.length > 0
      ? payload.postFormats
      : (["image", "carousel", "reel", "story"] as PostFormat[]);

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      created_by: user.id,
      post_formats: postFormats,
      client_name: payload.clientName?.trim() || null,
      client_email: payload.clientEmail?.trim().toLowerCase() || null,
    })
    .select()
    .single();

  if (orgError) return { error: orgError.message };

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "admin" as MemberRole,
    });

  if (memberError) return { error: memberError.message };

  const { data: brandKit, error: brandKitError } = await supabase
    .from("brand_kits")
    .insert({
      organization_id: org.id,
      name: `${name} Brand Kit`,
      tone_of_voice: payload.toneOfVoice?.trim() || null,
      objective: payload.objective?.trim() || null,
      colors: payload.colors?.length ? payload.colors : [],
    })
    .select("id")
    .single();

  if (brandKitError) return { error: brandKitError.message };

  if (payload.roleSlots?.length) {
    await supabase.from("org_role_slots").insert(
      payload.roleSlots.map((slot, i) => ({
        organization_id: org.id,
        role: slot.role,
        label: slot.label?.trim() || null,
        sort_order: i,
      }))
    );
  }

  const pillars =
    payload.pillars.length > 0
      ? payload.pillars
      : [...PILLAR_DEFAULTS];

  await supabase.from("content_pillars").insert(
    pillars.map((p, i) => ({
      organization_id: org.id,
      name: p.name.trim(),
      color: p.color,
      target_pct: p.target_pct,
      sort_order: i,
    }))
  );

  const defaultHashtags = [
    { category: "Marca", tags: ["#marca", "#brand"], sort_order: 0 },
    { category: "Sector", tags: ["#industria", "#negocio"], sort_order: 1 },
    { category: "Campaña", tags: ["#promo", "#oferta"], sort_order: 2 },
  ];
  await supabase.from("org_hashtag_groups").insert(
    defaultHashtags.map((h) => ({ organization_id: org.id, ...h }))
  );

  const clientEmail = payload.clientEmail?.trim().toLowerCase();
  if (clientEmail) {
    await supabase.from("invitations").insert({
      organization_id: org.id,
      email: clientEmail,
      role: "client" as MemberRole,
      invited_by: user.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/home");
  return { data: { ...org, brandKitId: brandKit.id } };
}

export async function addMemberByEmail(
  orgId: string,
  email: string,
  role: MemberRole
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return { error: "Correo requerido" };

  const admin = createAdminClient();
  if (admin) {
    return addMemberByEmailWithAdmin(
      supabase,
      admin,
      orgId,
      normalizedEmail,
      role,
      user.id
    );
  }

  const { data, error } = await supabase.rpc("add_org_member_by_email", {
    p_org_id: orgId,
    p_email: normalizedEmail,
    p_role: role,
  });

  if (error) {
    const msg = error.message || "Error al agregar miembro";
    if (msg.includes("Sin permiso")) return { error: "Sin permiso para agregar miembros" };
    if (msg.includes("No hay cuenta")) return { error: msg };
    if (msg.includes("ya tiene") || msg.includes("ya es")) return { error: msg };
    if (error.code === "PGRST202") {
      return {
        error:
          "Falta la clave secreta de Supabase. Agrégala en .env.local como SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY) y reinicia npm run dev.",
      };
    }
    return { error: msg };
  }

  revalidatePath(`/org/${orgId}/team`);
  revalidatePath(`/org/${orgId}/home`);
  revalidatePath("/home", "layout");
  return { data };
}

async function addMemberByEmailWithAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  orgId: string,
  normalizedEmail: string,
  role: MemberRole,
  callerId: string
) {
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", callerId)
    .single();

  if (!membership || !["admin", "creator"].includes(membership.role)) {
    return { error: "Sin permiso para agregar miembros" };
  }

  let targetUserId: string | null = null;
  let page = 1;

  while (!targetUserId) {
    const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (usersError) return { error: usersError.message };

    const match = usersPage.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );
    if (match) {
      targetUserId = match.id;
      break;
    }

    if (usersPage.users.length < 200) break;
    page += 1;
  }

  if (!targetUserId) {
    return {
      error:
        "No hay cuenta con ese correo. La persona debe registrarse primero en Grilla.",
    };
  }

  const { data: existing } = await admin
    .from("organization_members")
    .select("id, role, extra_roles")
    .eq("organization_id", orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  let memberId: string;
  let primaryRole = role;
  let extraRoles: MemberRole[] = [];

  if (existing) {
    extraRoles = (existing.extra_roles as MemberRole[] | null) ?? [];
    if (existing.role === role || extraRoles.includes(role)) {
      return { error: "Esta persona ya tiene ese rol en el equipo" };
    }

    const nextExtraRoles = [...extraRoles, role];
    const { error: updateError } = await admin
      .from("organization_members")
      .update({ extra_roles: nextExtraRoles })
      .eq("id", existing.id);

    if (updateError) return { error: updateError.message };

    memberId = existing.id;
    primaryRole = existing.role as MemberRole;
    extraRoles = nextExtraRoles;
  } else {
    const { data: inserted, error: insertError } = await admin
      .from("organization_members")
      .insert({
        organization_id: orgId,
        user_id: targetUserId,
        role,
      })
      .select("id")
      .single();

    if (insertError) return { error: insertError.message };

    memberId = inserted.id;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, full_name")
    .eq("id", targetUserId)
    .maybeSingle();

  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    "Sin nombre";

  revalidatePath(`/org/${orgId}/team`);
  revalidatePath(`/org/${orgId}/home`);
  revalidatePath("/home", "layout");

  return {
    data: {
      id: memberId,
      user_id: targetUserId,
      name,
      role: primaryRole,
      extra_roles: extraRoles,
    },
  };
}

/** @deprecated Usar addMemberByEmail — agrega usuarios ya registrados al equipo */
export async function inviteMember(
  orgId: string,
  email: string,
  role: MemberRole
) {
  return addMemberByEmail(orgId, email, role);
}

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: invitation, error: invError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (invError || !invitation) return { error: "Invitación no válida" };

  if (new Date(invitation.expires_at) < new Date()) {
    return { error: "Invitación expirada" };
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
    });

  if (memberError) return { error: memberError.message };

  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  revalidatePath("/dashboard");
  return { data: invitation };
}

export async function updateHomeWidgets(
  scope: "global" | "org",
  widgets: string[],
  orgId?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("home_widgets")
    .eq("id", user.id)
    .single();

  const current = (profile?.home_widgets as {
    global: string[];
    orgs: Record<string, string[]>;
  }) || { global: [], orgs: {} };

  const updated =
    scope === "global"
      ? { ...current, global: widgets.slice(0, MAX_SLOT_WIDGETS) }
      : {
          ...current,
          orgs: {
            ...current.orgs,
            [orgId!]: widgets.slice(0, MAX_SLOT_WIDGETS),
          },
        };

  const { error } = await supabase
    .from("profiles")
    .update({ home_widgets: updated })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/home");
  revalidatePath("/home/widgets");
  if (orgId) {
    revalidatePath(`/org/${orgId}/home`);
    revalidatePath(`/org/${orgId}/home/widgets`);
  }
  return { success: true };
}

export async function updateMemberRoles(
  orgId: string,
  userId: string,
  role: MemberRole,
  extraRoles: MemberRole[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: myMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  const isAdmin = myMembership?.role === "admin";
  const isSelf = user.id === userId;

  if (!isAdmin && !isSelf) {
    return { error: "Sin permiso para editar roles" };
  }

  const cleaned = extraRoles.filter((r) => r !== role);

  const { error } = await supabase
    .from("organization_members")
    .update({ extra_roles: cleaned })
    .eq("organization_id", orgId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/home`);
  revalidatePath(`/org/${orgId}/team`);
  revalidatePath(`/org/${orgId}/grilla`);
  return { success: true };
}

export async function removeMemberFromOrg(orgId: string, memberUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  if (user.id === memberUserId) {
    return { error: "No puedes eliminarte a ti mismo del equipo" };
  }

  const { data: myMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (myMembership?.role !== "admin") {
    return { error: "Solo el admin puede eliminar miembros" };
  }

  const client = createAdminClient() ?? supabase;
  const { error } = await client
    .from("organization_members")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", memberUserId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/team`);
  revalidatePath(`/org/${orgId}/home`);
  revalidatePath("/home", "layout");
  return { success: true };
}

export async function createPost(
  orgId: string,
  data: {
    title: string;
    scheduled_at?: string;
    format: string;
    pillar?: string;
    copy?: string;
    caption?: string;
    plate?: string;
    org_identifier_id?: string;
    identifier_photo_url?: string;
    in_drive?: boolean;
    references_text?: string;
    content_creator_id?: string;
    assigned_to?: string;
    community_manager_id?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const contentCreatorId = data.content_creator_id || user.id;

  const { findExistingPost } = await import("@/lib/post-dedupe");
  const existing = await findExistingPost(
    supabase,
    orgId,
    data.title,
    data.scheduled_at || null
  );
  if (existing) {
    revalidatePath(`/org/${orgId}/grilla`);
    return { data: existing };
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      organization_id: orgId,
      title: data.title,
      scheduled_at: data.scheduled_at || null,
      format: data.format,
      pillar: data.pillar || null,
      copy: data.copy || null,
      caption: data.caption || null,
      plate: data.plate || null,
      org_identifier_id: data.org_identifier_id || null,
      identifier_photo_url: data.identifier_photo_url || null,
      in_drive: data.in_drive ?? false,
      references_text: data.references_text || null,
      assigned_to: data.assigned_to || null,
      community_manager_id: data.community_manager_id || null,
      created_by: contentCreatorId,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const taskDueAt = data.scheduled_at || null;
  const assignee = data.assigned_to || contentCreatorId;

  if (assignee) {
    const row = {
      organization_id: orgId,
      title: data.title,
      description: "Post creado en la grilla",
      assigned_to: assignee,
      created_by: user.id,
      post_id: post.id,
      due_at: taskDueAt,
    };

    const { ensureTaskForPost } = await import("@/lib/task-sync");
    await ensureTaskForPost(supabase, row, "contenido");

    if (data.assigned_to) {
      const { notifyPostAssignment } = await import("@/lib/notifications");
      await notifyPostAssignment(
        orgId,
        post.id,
        data.title,
        data.assigned_to,
        user.id
      );
    }
  }

  revalidatePath(`/org/${orgId}/grilla`);
  return { data: post };
}

export async function bulkCreatePosts(
  orgId: string,
  posts: BulkPostInput[],
  team: {
    content_creator_id?: string;
    assigned_to?: string;
    community_manager_id?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };
  if (posts.length === 0) return { error: "No hay posts para crear" };

  const contentCreatorId = team.content_creator_id || user.id;
  const assignee = team.assigned_to || contentCreatorId;

  const { findExistingPost } = await import("@/lib/post-dedupe");
  const rowsToInsert: typeof posts = [];
  const skipped: { id: string }[] = [];

  for (const post of posts) {
    const existing = await findExistingPost(
      supabase,
      orgId,
      post.title,
      post.scheduled_at ?? null
    );
    if (existing) {
      skipped.push(existing);
      continue;
    }
    rowsToInsert.push(post);
  }

  if (rowsToInsert.length === 0) {
    revalidatePath(`/org/${orgId}/grilla`);
    revalidatePath(`/org/${orgId}/calendario`);
    return { data: skipped, count: 0, skipped: skipped.length };
  }

  const rows = rowsToInsert.map((post) => ({
    organization_id: orgId,
    title: post.title,
    scheduled_at: post.scheduled_at,
    format: post.format,
    pillar: post.pillar || null,
    copy: post.copy || null,
    caption: post.caption || null,
    plate: post.plate || null,
    org_identifier_id: post.org_identifier_id || null,
    identifier_photo_url: post.identifier_photo_url || null,
    in_drive: post.in_drive ?? false,
    references_text: post.references_text || null,
    assigned_to: team.assigned_to || null,
    community_manager_id: team.community_manager_id || null,
    created_by: contentCreatorId,
  }));

  const { data: inserted, error } = await supabase
    .from("posts")
    .insert(rows)
    .select();

  if (error) return { error: error.message };

  const taskRows = (inserted || []).map((post) => ({
    organization_id: orgId,
    title: post.title,
    description: "Post creado en la grilla",
    assigned_to: assignee,
    created_by: user.id,
    post_id: post.id,
    due_at: post.scheduled_at,
    status: "contenido" as const,
  }));

  if (taskRows.length > 0) {
    const { ensureTaskForPost } = await import("@/lib/task-sync");
    await Promise.all(
      taskRows.map((row) => ensureTaskForPost(supabase, row, "contenido"))
    );
  }

  revalidatePath(`/org/${orgId}/grilla`);
  revalidatePath(`/org/${orgId}/calendario`);
  return {
    data: [...(inserted || []), ...skipped],
    count: inserted?.length ?? 0,
    skipped: skipped.length,
  };
}

export async function getGrillaDraft(
  orgId: string,
  period: GrillaPeriod,
  periodKey: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("grilla_drafts")
    .select("id, organization_id, period, period_key, payload, updated_by, updated_at")
    .eq("organization_id", orgId)
    .eq("period", period)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { data: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.updated_by)
    .maybeSingle();

  return {
    data: {
      ...data,
      payload: data.payload as GrillaDraftPayload,
      updated_by_name: profile?.full_name ?? null,
    },
  };
}

export async function saveGrillaDraft(
  orgId: string,
  period: GrillaPeriod,
  periodKey: string,
  payload: GrillaDraftPayload
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("grilla_drafts")
    .upsert(
      {
        organization_id: orgId,
        period,
        period_key: periodKey,
        payload,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,period,period_key" }
    )
    .select("updated_at")
    .single();

  if (error) return { error: error.message };

  return {
    data: {
      updated_at: data.updated_at,
      updated_by_name: null as string | null,
    },
  };
}

export async function deleteGrillaDraft(
  orgId: string,
  period: GrillaPeriod,
  periodKey: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("grilla_drafts")
    .delete()
    .eq("organization_id", orgId)
    .eq("period", period)
    .eq("period_key", periodKey);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updatePost(
  orgId: string,
  postId: string,
  data: {
    title?: string;
    scheduled_at?: string | null;
    format?: string;
    pillar?: string | null;
    copy?: string | null;
    caption?: string | null;
    plate?: string | null;
    org_identifier_id?: string | null;
    identifier_photo_url?: string | null;
    in_drive?: boolean;
    references_text?: string | null;
    objective?: string | null;
    cta?: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.scheduled_at !== undefined) updates.scheduled_at = data.scheduled_at;
  if (data.format !== undefined) updates.format = data.format;
  if (data.pillar !== undefined) updates.pillar = data.pillar;
  if (data.copy !== undefined) updates.copy = data.copy;
  if (data.caption !== undefined) updates.caption = data.caption;
  if (data.plate !== undefined) updates.plate = data.plate;
  if (data.org_identifier_id !== undefined)
    updates.org_identifier_id = data.org_identifier_id;
  if (data.identifier_photo_url !== undefined)
    updates.identifier_photo_url = data.identifier_photo_url;
  if (data.in_drive !== undefined) updates.in_drive = data.in_drive;
  if (data.references_text !== undefined)
    updates.references_text = data.references_text;
  if (data.objective !== undefined) updates.objective = data.objective;
  if (data.cta !== undefined) updates.cta = data.cta;

  const { error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function updatePostStatus(postId: string, status: string, orgId: string) {
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("title, status")
    .eq("id", postId)
    .single();

  const previousPostStatus = post?.status;

  const { error } = await supabase
    .from("posts")
    .update({ status })
    .eq("id", postId);

  if (error) return { error: error.message };

  const { syncTasksForPost } = await import("@/lib/task-sync");
  await syncTasksForPost(supabase, postId, previousPostStatus);

  if (post?.title) {
    const { notifyPostStatusChange } = await import("@/lib/notifications");
    await notifyPostStatusChange(postId, orgId, status, post.title);
  }

  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/revision`);
  revalidatePath(`/org/${orgId}/grilla`);
  revalidatePath(`/org/${orgId}/home`);
  revalidatePath("/home");
  revalidatePath("/home/calendario");
  return { success: true };
}

export async function reschedulePost(
  orgId: string,
  postId: string,
  scheduledAt: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("posts")
    .update({ scheduled_at: scheduledAt })
    .eq("id", postId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/calendario`);
  revalidatePath(`/org/${orgId}/grilla`);
  revalidatePath("/home/calendario");
  return { success: true };
}

export async function savePostMetrics(
  orgId: string,
  postId: string,
  data: {
    reach?: number | null;
    likes?: number | null;
    comments?: number | null;
    saves?: number | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("post_metrics").upsert(
    {
      post_id: postId,
      reach: data.reach ?? null,
      likes: data.likes ?? null,
      comments: data.comments ?? null,
      saves: data.saves ?? null,
      recorded_by: user.id,
      recorded_at: new Date().toISOString(),
    },
    { onConflict: "post_id" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/grilla/${postId}`);
  revalidatePath(`/org/${orgId}/estadisticas`);
  return { success: true };
}

export async function upsertContentPillar(
  orgId: string,
  data: {
    id?: string;
    name: string;
    color: string;
    target_pct: number;
    sort_order?: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || !["admin", "creator"].includes(membership.role)) {
    return { error: "Sin permiso para editar pilares" };
  }

  if (data.id) {
    const { error } = await supabase
      .from("content_pillars")
      .update({
        name: data.name,
        color: data.color,
        target_pct: data.target_pct,
        sort_order: data.sort_order ?? 0,
      })
      .eq("id", data.id)
      .eq("organization_id", orgId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("content_pillars").insert({
      organization_id: orgId,
      name: data.name,
      color: data.color,
      target_pct: data.target_pct,
      sort_order: data.sort_order ?? 0,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/org/${orgId}/estadisticas`);
  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/grilla`);
  revalidatePath("/home");
  return { success: true };
}

export async function deleteContentPillar(orgId: string, pillarId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || !["admin", "creator"].includes(membership.role)) {
    return { error: "Sin permiso para editar pilares" };
  }

  const { error } = await supabase
    .from("content_pillars")
    .delete()
    .eq("id", pillarId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/estadisticas`);
  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/grilla`);
  revalidatePath("/home");
  return { success: true };
}

export async function updateBrandStrategy(
  orgId: string,
  data: { tone_of_voice?: string; objective?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || !["admin", "creator"].includes(membership.role)) {
    return { error: "Sin permiso para editar la marca" };
  }

  const { error } = await supabase
    .from("brand_kits")
    .update({
      tone_of_voice: data.tone_of_voice?.trim() || null,
      objective: data.objective?.trim() || null,
    })
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/brand-kit`);
  return { success: true };
}

export async function saveOrgIdentifierConfig(
  orgId: string,
  data: {
    label: string | null;
    allow_photo: boolean;
    placeholder?: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || !["admin", "creator"].includes(membership.role)) {
    return { error: "Sin permiso para editar la marca" };
  }

  const label = data.label?.trim() || null;

  const { error } = await supabase
    .from("organizations")
    .update({
      identifier_label: label,
      identifier_allow_photo: label ? data.allow_photo : false,
      identifier_placeholder: label
        ? data.placeholder?.trim() || null
        : null,
    })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/grilla`);
  return { success: true };
}

export async function saveOrgIdentifier(
  orgId: string,
  data: {
    value: string;
    photo_url?: string | null;
    label?: string | null;
    allow_photo?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || !["admin", "creator", "designer"].includes(membership.role)) {
    return { error: "Sin permiso para editar identificadores" };
  }

  const value = data.value.trim();
  if (!value) return { error: "El valor es obligatorio" };

  if (data.label?.trim()) {
    const label = data.label.trim();
    await supabase
      .from("organizations")
      .update({
        identifier_label: label,
        identifier_allow_photo: data.allow_photo ?? true,
      })
      .eq("id", orgId);
  }

  const { data: maxRow } = await supabase
    .from("org_identifiers")
    .select("sort_order")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: row, error } = await supabase
    .from("org_identifiers")
    .insert({
      organization_id: orgId,
      value,
      photo_url: data.photo_url || null,
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un identificador con ese valor" };
    }
    return { error: error.message };
  }

  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/grilla`);
  return { data: row };
}

export async function updateOrgIdentifierPhoto(
  orgId: string,
  identifierId: string,
  photoUrl: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("org_identifiers")
    .update({ photo_url: photoUrl })
    .eq("id", identifierId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/grilla`);
  return { success: true };
}

export async function updateOrgIdentifier(
  orgId: string,
  identifierId: string,
  data: {
    value?: string;
    photo_url?: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || !["admin", "creator", "designer"].includes(membership.role)) {
    return { error: "Sin permiso para editar identificadores" };
  }

  const updates: { value?: string; photo_url?: string | null } = {};

  if (data.value !== undefined) {
    const value = data.value.trim();
    if (!value) return { error: "El valor es obligatorio" };
    updates.value = value;
  }

  if (data.photo_url !== undefined) {
    updates.photo_url = data.photo_url;
  }

  if (Object.keys(updates).length === 0) {
    return { error: "Nada que actualizar" };
  }

  const { data: row, error } = await supabase
    .from("org_identifiers")
    .update(updates)
    .eq("id", identifierId)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un identificador con ese valor" };
    }
    return { error: error.message };
  }

  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/grilla`);
  return { data: row };
}

export async function deleteOrgIdentifier(orgId: string, identifierId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || !["admin", "creator", "designer"].includes(membership.role)) {
    return { error: "Sin permiso" };
  }

  const { error } = await supabase
    .from("org_identifiers")
    .delete()
    .eq("id", identifierId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/grilla`);
  return { success: true };
}

export async function saveHashtagGroup(
  orgId: string,
  data: { id?: string; category: string; tags: string[] }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  if (data.id) {
    const { error } = await supabase
      .from("org_hashtag_groups")
      .update({ category: data.category, tags: data.tags })
      .eq("id", data.id)
      .eq("organization_id", orgId);
    if (error) return { error: error.message };
  } else {
    const { data: maxRow } = await supabase
      .from("org_hashtag_groups")
      .select("sort_order")
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("org_hashtag_groups").insert({
      organization_id: orgId,
      category: data.category,
      tags: data.tags,
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/grilla`);
  return { success: true };
}

export async function deleteHashtagGroup(orgId: string, groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || !["admin", "creator"].includes(membership.role)) {
    return { error: "Sin permiso" };
  }

  const { error } = await supabase
    .from("org_hashtag_groups")
    .delete()
    .eq("id", groupId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/marca`);
  return { success: true };
}

export async function updateBrandKit(
  orgId: string,
  data: {
    name?: string;
    colors?: string[];
    fonts?: { heading: string; body: string };
    guidelines?: string | null;
    logo_url?: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || !["admin", "creator", "designer"].includes(membership.role)) {
    return { error: "Sin permiso para editar el brand kit" };
  }

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.colors !== undefined) updates.colors = data.colors;
  if (data.fonts !== undefined) updates.fonts = data.fonts;
  if (data.guidelines !== undefined) updates.guidelines = data.guidelines;
  if (data.logo_url !== undefined) updates.logo_url = data.logo_url;

  const { error } = await supabase
    .from("brand_kits")
    .update(updates)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/marca`);
  revalidatePath(`/org/${orgId}/brand-kit`);
  return { success: true };
}

export async function deletePost(orgId: string, postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (membership?.role !== "admin") {
    return { error: "Solo admins pueden eliminar posts" };
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgId}/grilla`);
  revalidatePath(`/org/${orgId}/estadisticas`);
  revalidatePath(`/org/${orgId}/home`);
  return { success: true };
}
export async function reviewPost(
  orgId: string,
  postId: string,
  action: "approve" | "reject",
  feedback?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, extra_roles")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  const roles = [
    membership?.role,
    ...((membership?.extra_roles as string[]) || []),
  ];
  const canReview = roles.some((r) =>
    ["admin", "community_manager", "creator"].includes(r || "")
  );

  if (!canReview) return { error: "Sin permiso para revisar" };

  const newStatus = action === "approve" ? "approved" : "in_design";

  const { data: post } = await supabase
    .from("posts")
    .select("title, status")
    .eq("id", postId)
    .eq("organization_id", orgId)
    .single();

  if (!post || post.status !== "review") {
    return { error: "El post no está en revisión" };
  }

  const { error } = await supabase
    .from("posts")
    .update({ status: newStatus })
    .eq("id", postId);

  if (error) return { error: error.message };

  const { syncTasksForPost } = await import("@/lib/task-sync");
  await syncTasksForPost(supabase, postId, post.status);

  if (feedback?.trim()) {
    const { createPostComment } = await import("@/lib/notifications");
    const prefix =
      action === "approve" ? "✅ Aprobado:" : "🔄 Cambios solicitados:";
    await createPostComment(orgId, postId, `${prefix} ${feedback.trim()}`);
  }

  const { notifyPostStatusChange } = await import("@/lib/notifications");
  await notifyPostStatusChange(postId, orgId, newStatus, post.title);

  revalidatePath(`/org/${orgId}/revision`);
  revalidatePath(`/org/${orgId}/grilla`);
  revalidatePath(`/org/${orgId}/grilla/${postId}`);
  revalidatePath(`/org/${orgId}/estadisticas`);
  return { success: true, status: newStatus };
}

export async function importPostMetricsCsv(
  orgId: string,
  rows: { title: string; reach?: number; likes?: number; comments?: number; saves?: number }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title")
    .eq("organization_id", orgId);

  if (!posts?.length) return { error: "No hay posts en esta organización" };

  const titleMap = new Map(
    posts.map((p) => [p.title.toLowerCase().trim(), p.id])
  );

  let imported = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const postId = titleMap.get(row.title.toLowerCase().trim());
    if (!postId) {
      errors.push(`No encontrado: "${row.title}"`);
      continue;
    }

    const { error } = await supabase.from("post_metrics").upsert(
      {
        post_id: postId,
        reach: row.reach ?? null,
        likes: row.likes ?? null,
        comments: row.comments ?? null,
        saves: row.saves ?? null,
        recorded_by: user.id,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: "post_id" }
    );

    if (error) {
      errors.push(`${row.title}: ${error.message}`);
    } else {
      imported++;
    }
  }

  revalidatePath(`/org/${orgId}/estadisticas`);
  revalidatePath(`/org/${orgId}/grilla`);
  return { imported, errors };
}

export async function registerPostAsset(
  postId: string,
  orgId: string,
  data: {
    file_url: string;
    file_name: string;
    file_type: string;
    sort_order: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: asset, error } = await supabase
    .from("post_assets")
    .insert({
      post_id: postId,
      file_url: data.file_url,
      file_name: data.file_name,
      file_type: data.file_type,
      sort_order: data.sort_order,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const newStatus = await autoUpdatePostStatusFromAssets(supabase, postId, orgId);

  return { success: true, asset, newStatus };
}

async function autoUpdatePostStatusFromAssets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  orgId?: string
): Promise<string | null> {
  const [{ data: post }, { count }] = await Promise.all([
    supabase
      .from("posts")
      .select("status, title, organization_id")
      .eq("id", postId)
      .single(),
    supabase
      .from("post_assets")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId),
  ]);

  if (!post) return null;

  const assetCount = count ?? 0;
  let newStatus: string | null = null;

  if (
    assetCount > 0 &&
    ["draft", "brief_ready", "in_design"].includes(post.status)
  ) {
    newStatus = "review";
    await supabase
      .from("posts")
      .update({ status: newStatus })
      .eq("id", postId);
  } else if (assetCount === 0 && post.status === "review") {
    newStatus = "draft";
    await supabase
      .from("posts")
      .update({ status: newStatus })
      .eq("id", postId);
  }

  const { syncTasksForPost } = await import("@/lib/task-sync");
  await syncTasksForPost(supabase, postId, post.status);

  if (newStatus === "review") {
    const resolvedOrgId = orgId ?? post.organization_id;
    const { notifyPostStatusChange } = await import("@/lib/notifications");
    await notifyPostStatusChange(
      postId,
      resolvedOrgId,
      newStatus,
      post.title
    );
  }

  const resolvedOrgId = orgId ?? post.organization_id;
  if (resolvedOrgId) {
    revalidatePath(`/org/${resolvedOrgId}/grilla/${postId}`);
    revalidatePath(`/org/${resolvedOrgId}/grilla`);
    revalidatePath(`/org/${resolvedOrgId}/home`);
  }
  revalidatePath("/home");
  revalidatePath("/home/calendario");

  return newStatus;
}

export async function deletePostAsset(
  assetId: string,
  postId: string,
  orgId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: asset, error: fetchError } = await supabase
    .from("post_assets")
    .select("*")
    .eq("id", assetId)
    .eq("post_id", postId)
    .single();

  if (fetchError || !asset) return { error: "Archivo no encontrado" };

  const url = new URL(asset.file_url);
  const storagePath = url.pathname.split("/post-assets/")[1];
  if (storagePath) {
    await supabase.storage.from("post-assets").remove([decodeURIComponent(storagePath)]);
  }

  const { error } = await supabase.from("post_assets").delete().eq("id", assetId);

  if (error) return { error: error.message };

  const newStatus = await autoUpdatePostStatusFromAssets(supabase, postId, orgId);

  return { success: true, newStatus };
}

export async function createOrgAssetLink(
  orgId: string,
  data: { category: string; label: string; url: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (membership?.role !== "admin") {
    return { error: "Solo admins pueden agregar links" };
  }

  const { data: maxRow } = await supabase
    .from("org_asset_links")
    .select("sort_order")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: link, error } = await supabase
    .from("org_asset_links")
    .insert({
      organization_id: orgId,
      category: data.category.trim() || "General",
      label: data.label.trim(),
      url: data.url.trim(),
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  return { link };
}

export async function deleteOrgAssetLink(orgId: string, linkId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (membership?.role !== "admin") {
    return { error: "Solo admins pueden eliminar links" };
  }

  const { error } = await supabase
    .from("org_asset_links")
    .delete()
    .eq("id", linkId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function updateOrgCalendarSubscriptions(
  orgId: string,
  catalogIds: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .single();

  if (!membership || membership.role === "client") {
    return { error: "No autorizado" };
  }

  const { data: existing } = await supabase
    .from("organization_calendar_subscriptions")
    .select("catalog_id")
    .eq("organization_id", orgId);

  const existingIds = (existing ?? []).map((r) => r.catalog_id);
  const toAdd = catalogIds.filter((id) => !existingIds.includes(id));
  const toRemove = existingIds.filter((id) => !catalogIds.includes(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("organization_calendar_subscriptions")
      .delete()
      .eq("organization_id", orgId)
      .in("catalog_id", toRemove);

    if (error) return { error: error.message };
  }

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("organization_calendar_subscriptions")
      .insert(
        toAdd.map((catalog_id) => ({
          organization_id: orgId,
          catalog_id,
        }))
      );

    if (error) return { error: error.message };
  }

  revalidatePath(`/org/${orgId}/calendario`);
  revalidatePath(`/org/${orgId}/home`);
  revalidatePath("/home/calendario");

  return { success: true };
}

export async function getFertileRecommendations(
  eventId: string,
  options?: { orgId?: string }
) {
  try {
    const { getFertileRecommendationsForEvent } = await import(
      "@/lib/calendar-data"
    );
    return getFertileRecommendationsForEvent(eventId, options);
  } catch (error) {
    console.error("getFertileRecommendations:", error);
    return [];
  }
}
