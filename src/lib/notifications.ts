"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createNotification,
  createNotifications,
} from "@/lib/notifications-data";
import { mergeMentionIds, parseMentionsFromBody } from "@/lib/mentions";
import type { TaskStatus } from "@/lib/types";
import { TASK_STATUS_LABELS } from "@/lib/types";

function postLink(orgId: string, postId: string) {
  return `/org/${orgId}/grilla/${postId}`;
}

async function notifyUsers(
  userIds: string[],
  payload: {
    orgId: string;
    type: "mention" | "assignment" | "status_change" | "comment";
    title: string;
    body?: string;
    link?: string;
    relatedPostId?: string;
  },
  excludeUserId?: string
) {
  const unique = [...new Set(userIds)].filter(
    (id) => id && id !== excludeUserId
  );
  if (!unique.length) return;

  await createNotifications(
    unique.map((userId) => ({
      userId,
      orgId: payload.orgId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      relatedPostId: payload.relatedPostId,
    }))
  );
}

export async function notifyPostStatusChange(
  postId: string,
  orgId: string,
  newStatus: string,
  postTitle: string
) {
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("community_manager_id, created_by, assigned_to")
    .eq("id", postId)
    .single();

  if (!post) return;

  const link = postLink(orgId, postId);

  if (newStatus === "review") {
    await notifyUsers(
      [post.community_manager_id, post.created_by].filter(Boolean) as string[],
      {
        orgId,
        type: "status_change",
        title: "Post en revisión",
        body: `"${postTitle}" está listo para revisar`,
        link,
        relatedPostId: postId,
      }
    );
  }

  if (newStatus === "published" && post.community_manager_id) {
    await createNotification({
      userId: post.community_manager_id,
      orgId,
      type: "status_change",
      title: "Post publicado",
      body: `"${postTitle}" fue publicado — registra métricas en 24h`,
      link,
      relatedPostId: postId,
    });
  }

  if (newStatus === "in_design" && post.assigned_to) {
    await createNotification({
      userId: post.assigned_to,
      orgId,
      type: "assignment",
      title: "Nuevo brief para diseñar",
      body: `"${postTitle}" está listo para diseño`,
      link,
      relatedPostId: postId,
    });
  }

  if (newStatus === "brief_ready" && post.assigned_to) {
    await createNotification({
      userId: post.assigned_to,
      orgId,
      type: "assignment",
      title: "Brief listo",
      body: `"${postTitle}" tiene brief listo para diseño`,
      link,
      relatedPostId: postId,
    });
  }

  if (newStatus === "approved") {
    await notifyUsers(
      [post.community_manager_id, post.created_by].filter(Boolean) as string[],
      {
        orgId,
        type: "status_change",
        title: "Post aprobado",
        body: `"${postTitle}" fue aprobado`,
        link,
        relatedPostId: postId,
      }
    );
  }

  if (newStatus === "scheduled" && post.community_manager_id) {
    await createNotification({
      userId: post.community_manager_id,
      orgId,
      type: "status_change",
      title: "Post programado",
      body: `"${postTitle}" fue programado para publicación`,
      link,
      relatedPostId: postId,
    });
  }
}

export async function notifyPostAssignment(
  orgId: string,
  postId: string,
  postTitle: string,
  assignedTo: string,
  actorId: string
) {
  await notifyUsers(
    [assignedTo],
    {
      orgId,
      type: "assignment",
      title: "Post asignado",
      body: `Te asignaron "${postTitle}" para diseño`,
      link: postLink(orgId, postId),
      relatedPostId: postId,
    },
    actorId
  );
}

export async function notifyTaskStatusChange(
  orgId: string,
  postId: string,
  postTitle: string,
  assigneeId: string,
  previousStatus: TaskStatus,
  newStatus: TaskStatus
) {
  if (previousStatus === newStatus) return;

  const labels: Record<TaskStatus, string> = {
    contenido: TASK_STATUS_LABELS.contenido,
    brief_listo: TASK_STATUS_LABELS.brief_listo,
    en_revision: TASK_STATUS_LABELS.en_revision,
    aprobado: TASK_STATUS_LABELS.aprobado,
  };

  await createNotification({
    userId: assigneeId,
    orgId,
    type: "status_change",
    title: "Tarea actualizada",
    body: `"${postTitle}": ${labels[previousStatus]} → ${labels[newStatus]}`,
    link: postLink(orgId, postId),
    relatedPostId: postId,
  });
}

export async function notifyPostComment(
  orgId: string,
  postId: string,
  postTitle: string,
  authorId: string,
  authorName: string,
  body: string,
  mentionedUserIds: string[],
  members: { user_id: string; name: string }[]
) {
  const supabase = await createClient();
  const link = postLink(orgId, postId);

  const { data: post } = await supabase
    .from("posts")
    .select("created_by, assigned_to, community_manager_id")
    .eq("id", postId)
    .single();

  const parsedMentions = parseMentionsFromBody(body, members);
  const allMentions = mergeMentionIds(mentionedUserIds, parsedMentions, authorId);

  const participants = [
    post?.created_by,
    post?.assigned_to,
    post?.community_manager_id,
  ].filter(Boolean) as string[];

  await notifyUsers(allMentions, {
    orgId,
    type: "mention",
    title: `${authorName} te mencionó`,
    body: `En "${postTitle}": ${body.slice(0, 120)}${body.length > 120 ? "…" : ""}`,
    link,
    relatedPostId: postId,
  });

  const commentRecipients = participants.filter(
    (id) => !allMentions.includes(id)
  );

  await notifyUsers(commentRecipients, {
    orgId,
    type: "comment",
    title: "Nuevo comentario",
    body: `${authorName} comentó en "${postTitle}"`,
    link,
    relatedPostId: postId,
  }, authorId);
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return { error: error.message };
  return { success: true };
}

export async function createPostComment(
  orgId: string,
  postId: string,
  body: string,
  mentionedUserIds: string[] = []
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const trimmed = body.trim();
  if (!trimmed) return { error: "El comentario no puede estar vacío" };

  const [{ data: post }, { data: profile }] = await Promise.all([
    supabase
      .from("posts")
      .select("title")
      .eq("id", postId)
      .eq("organization_id", orgId)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, first_name, last_name")
      .eq("id", user.id)
      .single(),
  ]);

  if (!post) return { error: "Post no encontrado" };

  const { data: comment, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      organization_id: orgId,
      author_id: user.id,
      body: trimmed,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const authorName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    "Alguien";

  const { getOrgTeamMembers } = await import("@/lib/team-data");
  const members = await getOrgTeamMembers(supabase, orgId);

  await notifyPostComment(
    orgId,
    postId,
    post.title,
    user.id,
    authorName,
    trimmed,
    mentionedUserIds,
    members.map((m) => ({ user_id: m.user_id, name: m.name }))
  );

  return { success: true, comment };
}
