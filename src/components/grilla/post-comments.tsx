"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { createPostComment } from "@/lib/notifications";
import { splitMentionSegments } from "@/lib/mentions";
import { getProfileDisplayName, getProfileInitials } from "@/lib/profile-display-name";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { PostComment } from "@/lib/types";

interface CommentMember {
  user_id: string;
  name: string;
  avatar_url?: string | null;
}

interface PostCommentsProps {
  postId: string;
  orgId: string;
  initialComments: PostComment[];
  members: CommentMember[];
  currentUserId: string;
}

function matchesMentionQuery(member: CommentMember, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const name = member.name.toLowerCase();
  return name.includes(q) || name.split(/\s+/).some((part) => part.startsWith(q));
}

export function PostComments({
  postId,
  orgId,
  initialComments,
  members: initialMembers,
  currentUserId,
}: PostCommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const [teamMembers, setTeamMembers] = useState(
    initialMembers.filter((m) => m.user_id !== currentUserId)
  );
  const [body, setBody] = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = teamMembers.filter((m) =>
    matchesMentionQuery(m, mentionQuery)
  );

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("organization_members")
        .select(
          "user_id, profiles(first_name, last_name, full_name, avatar_url)"
        )
        .eq("organization_id", orgId);

      if (cancelled || error || !data) return;

      const mapped = data
        .map((row) => {
          const profile = row.profiles as {
            first_name?: string | null;
            last_name?: string | null;
            full_name?: string | null;
            avatar_url?: string | null;
          } | null;

          return {
            user_id: row.user_id,
            name: getProfileDisplayName(profile),
            avatar_url: profile?.avatar_url ?? null,
          };
        })
        .filter((m) => m.user_id !== currentUserId);

      setTeamMembers(mapped);
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [orgId, currentUserId]);

  const updateMenuPos = () => {
    const el = textareaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  const syncMentionState = (value: string, cursor: number) => {
    const before = value.slice(0, cursor);
    const atMatch = before.match(/@([^\n@]*)$/);

    if (atMatch) {
      setShowSuggestions(true);
      setMentionQuery(atMatch[1]);
      setActiveIndex(0);
      requestAnimationFrame(updateMenuPos);
    } else {
      setShowSuggestions(false);
      setMentionQuery("");
      setActiveIndex(0);
    }
  };

  useEffect(() => {
    if (!showSuggestions) return;

    updateMenuPos();
    window.addEventListener("scroll", updateMenuPos, true);
    window.addEventListener("resize", updateMenuPos);

    return () => {
      window.removeEventListener("scroll", updateMenuPos, true);
      window.removeEventListener("resize", updateMenuPos);
    };
  }, [showSuggestions, body]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    setBody(value);
    syncMentionState(value, cursor);
  };

  const insertMention = (member: CommentMember) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart ?? body.length;
    const before = body.slice(0, cursor);
    const after = body.slice(cursor);
    const atIndex = before.lastIndexOf("@");
    if (atIndex === -1) return;

    const prefix = before.slice(0, atIndex);
    const mention = `@${member.name} `;
    const next = prefix + mention + after;

    setBody(next);
    setMentionedIds((prev) =>
      prev.includes(member.user_id) ? prev : [...prev, member.user_id]
    );
    setShowSuggestions(false);
    setMentionQuery("");
    setActiveIndex(0);

    requestAnimationFrame(() => {
      textarea.focus();
      const pos = prefix.length + mention.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || saving) return;

    setSaving(true);

    const result = await createPostComment(
      orgId,
      postId,
      trimmed,
      mentionedIds
    );

    if (result.error) {
      setSaving(false);
      return;
    }

    const author =
      teamMembers.find((m) => m.user_id === currentUserId) ??
      initialMembers.find((m) => m.user_id === currentUserId);

    const newComment: PostComment = {
      ...(result.comment as PostComment),
      author_name: author?.name ?? "Tú",
      author_avatar_url: author?.avatar_url ?? null,
    };

    setComments((prev) => [...prev, newComment]);
    setBody("");
    setMentionedIds([]);
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestions[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const mentionMenu =
    showSuggestions &&
    typeof document !== "undefined" &&
    createPortal(
      <ul
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          zIndex: 9999,
        }}
        className="max-h-44 overflow-y-auto rounded-md border border-border bg-surface shadow-lg py-1"
      >
        {suggestions.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted">
            No hay miembros para mencionar
          </li>
        ) : (
          suggestions.map((member, index) => (
            <li key={member.user_id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertMention(member)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors text-left",
                  index === activeIndex
                    ? "bg-neutral-100"
                    : "hover:bg-neutral-50"
                )}
              >
                <MemberAvatar name={member.name} avatarUrl={member.avatar_url} />
                <span className="truncate">{member.name}</span>
              </button>
            </li>
          ))
        )}
      </ul>,
      document.body
    );

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium text-muted uppercase tracking-wide">
        Comentarios
      </h3>

      {comments.length > 0 && (
        <ul className="space-y-2 pb-1">
          {comments.map((comment) => (
            <li key={comment.id} className="text-sm leading-relaxed">
              <span className="font-medium">{comment.author_name}</span>
              <span className="text-muted"> · </span>
              <span className="whitespace-pre-wrap">
                <CommentBody body={comment.body} members={teamMembers} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={(e) =>
            syncMentionState(body, e.currentTarget.selectionStart ?? body.length)
          }
          placeholder="Comentar… usa @ para mencionar"
          rows={2}
          disabled={saving}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-foreground/10 disabled:opacity-50"
        />

        {mentionMenu}

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!body.trim() || saving}
            loading={saving}
          >
            Publicar
          </Button>
        </div>
      </div>
    </section>
  );
}

function MemberAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-6 w-6 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium text-muted">
      {getProfileInitials(name)}
    </span>
  );
}

function CommentBody({
  body,
  members,
}: {
  body: string;
  members: CommentMember[];
}) {
  const segments = splitMentionSegments(body);
  const nameSet = new Set(members.map((m) => m.name.toLowerCase()));

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "mention" && nameSet.has(seg.value.toLowerCase()) ? (
          <span key={i} className={cn("font-medium text-foreground/80")}>
            @{seg.value}
          </span>
        ) : (
          <span key={i}>{seg.type === "mention" ? `@${seg.value}` : seg.value}</span>
        )
      )}
    </>
  );
}
