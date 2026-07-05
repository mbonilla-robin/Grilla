import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email";
import { getProfileDisplayName } from "@/lib/profile-display-name";
import type { NotificationType } from "@/lib/types";

export async function createNotification(data: {
  userId: string;
  orgId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  relatedPostId?: string;
  sendEmail?: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: data.userId,
    organization_id: data.orgId || null,
    type: data.type,
    title: data.title,
    body: data.body || null,
    link: data.link || null,
    related_post_id: data.relatedPostId || null,
  });
  if (error) {
    console.error("createNotification error:", error.message);
    return;
  }

  if (data.sendEmail !== false) {
    await maybeSendNotificationEmail(data.userId, data.title, data.body, data.link);
  }
}

async function maybeSendNotificationEmail(
  userId: string,
  title: string,
  body?: string,
  link?: string
) {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (!email) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const href = link ? `${appUrl}${link}` : appUrl;

  await sendNotificationEmail({
    to: email,
    subject: `[Grilla] ${title}`,
    html: `
      <p><strong>${title}</strong></p>
      ${body ? `<p>${body}</p>` : ""}
      ${link ? `<p><a href="${href}">Ver en Grilla</a></p>` : ""}
    `,
  });
}

export async function createNotifications(
  items: {
    userId: string;
    orgId?: string;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
    relatedPostId?: string;
  }[]
) {
  for (const item of items) {
    await createNotification(item);
  }
}

export async function getNotifications(userId: string, limit = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("notifications count error:", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getPostComments(postId: string) {
  const supabase = await createClient();
  const { data: comments } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (!comments?.length) return [];

  const authorIds = [...new Set(comments.map((c) => c.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, first_name, last_name, avatar_url")
    .in("id", authorIds);

  const profileById = new Map((profiles || []).map((p) => [p.id, p]));

  return comments.map((c) => {
    const p = profileById.get(c.author_id);
    return {
      ...c,
      author_name: getProfileDisplayName(p),
      author_avatar_url: p?.avatar_url ?? null,
    };
  });
}
