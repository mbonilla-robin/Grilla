import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgTeamMembers } from "@/lib/team-data";
import { memberHasRole } from "@/lib/team-assignments";
import {
  dbTaskStatus,
  legacyTaskStatus,
  primaryTaskAssignee,
  syncTasksForPost,
  taskStatusFromPost,
} from "@/lib/task-sync";
import type { MemberRole } from "@/lib/types";

function soleMemberWithRole(
  members: Awaited<ReturnType<typeof getOrgTeamMembers>>,
  role: MemberRole
) {
  const matches = members.filter((m) => memberHasRole(m, role));
  return matches.length === 1 ? matches[0] : null;
}

async function upsertTaskStatus(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  id: string,
  patch: Record<string, unknown>,
  status: ReturnType<typeof taskStatusFromPost>
) {
  const { error } = await admin
    .from("tasks")
    .update({ ...patch, status: dbTaskStatus(status) })
    .eq("id", id);

  if (error) {
    await admin
      .from("tasks")
      .update({ ...patch, status: legacyTaskStatus(status) })
      .eq("id", id);
  }
}

export async function ensureSoleRolePostAssignments(orgId: string) {
  const admin = createAdminClient();
  if (!admin) return;

  const [{ data: posts }, members] = await Promise.all([
    admin
      .from("posts")
      .select(
        "id, title, status, scheduled_at, assigned_to, created_by, community_manager_id, post_assets(id)"
      )
      .eq("organization_id", orgId),
    getOrgTeamMembers(admin, orgId),
  ]);

  if (!posts?.length) return;

  const postIds = posts.map((p) => p.id);
  const { data: allTasks } = await admin
    .from("tasks")
    .select("id, post_id, due_at, created_at")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  const tasksByPost = new Map<string, typeof allTasks>();
  for (const task of allTasks || []) {
    if (!task.post_id) continue;
    const list = tasksByPost.get(task.post_id) || [];
    list.push(task);
    tasksByPost.set(task.post_id, list);
  }

  const soleDesigner = soleMemberWithRole(members, "designer");
  const soleCreator = soleMemberWithRole(members, "creator");
  const soleCm = soleMemberWithRole(members, "community_manager");
  const fallbackAuthor =
    members.find((m) => m.role === "admin")?.user_id ?? members[0]?.user_id;

  const needsWork = posts.some((post) => {
    const tasks = tasksByPost.get(post.id) || [];
    const needsAssignee =
      !post.assigned_to && !!soleDesigner;
    const needsCm = !post.community_manager_id && !!soleCm;
    const needsCreator = !post.created_by && !!soleCreator;
    const needsTask = tasks.length === 0;
    const needsDedupe = tasks.length > 1;
    const needsDue = tasks.length === 1 && !tasks[0].due_at && post.scheduled_at;
    return (
      needsAssignee ||
      needsCm ||
      needsCreator ||
      needsTask ||
      needsDedupe ||
      needsDue
    );
  });

  if (!needsWork) return;

  for (const post of posts) {
    const updates: Record<string, string> = {};

    if (!post.assigned_to && soleDesigner) {
      updates.assigned_to = soleDesigner.user_id;
    }
    if (!post.community_manager_id && soleCm) {
      updates.community_manager_id = soleCm.user_id;
    }

    if (Object.keys(updates).length > 0) {
      await admin.from("posts").update(updates).eq("id", post.id);
    }

    if (soleCreator && !post.created_by) {
      await admin
        .from("posts")
        .update({ created_by: soleCreator.user_id })
        .eq("id", post.id);
    }

    const designerId = updates.assigned_to ?? post.assigned_to;
    const creatorId = soleCreator?.user_id ?? post.created_by;
    const assignee = primaryTaskAssignee({
      assigned_to: designerId,
      created_by: creatorId,
    });
    const dueAt = post.scheduled_at || null;
    const hasAssets = !!(post.post_assets as { id: string }[] | null)?.length;
    const taskStatus = taskStatusFromPost(post.status, hasAssets);
    const existingTasks = tasksByPost.get(post.id) || [];

    if (existingTasks.length > 1) {
      const [keep, ...dupes] = existingTasks;
      await admin
        .from("tasks")
        .delete()
        .in(
          "id",
          dupes.map((t) => t.id)
        );
      const patch: Record<string, unknown> = {
        title: post.title,
        assigned_to: assignee,
      };
      if (!keep.due_at && dueAt) patch.due_at = dueAt;
      await upsertTaskStatus(admin, keep.id, patch, taskStatus);
    } else if (existingTasks.length === 1) {
      const keep = existingTasks[0];
      const patch: Record<string, unknown> = {
        title: post.title,
        assigned_to: assignee,
      };
      if (!keep.due_at && dueAt) patch.due_at = dueAt;
      await upsertTaskStatus(admin, keep.id, patch, taskStatus);
    } else if (assignee) {
      const row = {
        organization_id: orgId,
        title: post.title,
        description: "Asignación automática — rol único en la marca",
        assigned_to: assignee,
        created_by: fallbackAuthor,
        post_id: post.id,
        due_at: dueAt,
      };
      const { error } = await admin.from("tasks").insert({
        ...row,
        status: dbTaskStatus(taskStatus),
      });
      if (error) {
        await admin.from("tasks").insert({
          ...row,
          status: legacyTaskStatus(taskStatus),
        });
      }
    } else {
      await syncTasksForPost(admin, post.id);
    }
  }
}
