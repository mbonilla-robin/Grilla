import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import {
  STATUS_LABELS,
  FORMAT_LABELS,
  type Post,
} from "@/lib/types";

interface GrillaTableProps {
  posts: Post[];
  orgId: string;
}

export function GrillaTable({ posts, orgId }: GrillaTableProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted">Sin posts aún</p>
        <p className="text-sm text-muted/60 mt-1">
          Crea el primer post de la grilla
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="border-b border-border bg-background/50">
            <th className="text-left font-medium text-muted px-4 py-2.5 w-24">
              Fecha
            </th>
            <th className="text-left font-medium text-muted px-4 py-2.5 w-24">
              Pilar
            </th>
            <th className="text-left font-medium text-muted px-4 py-2.5">
              Título
            </th>
            <th className="text-left font-medium text-muted px-4 py-2.5 w-28">
              Formato
            </th>
            <th className="text-center font-medium text-muted px-4 py-2.5 w-16">
              Drive
            </th>
            <th className="text-left font-medium text-muted px-4 py-2.5 w-32">
              Placa
            </th>
            <th className="text-left font-medium text-muted px-4 py-2.5 w-28">
              Estado
            </th>
            <th className="text-left font-medium text-muted px-4 py-2.5 w-16">
              Brief
            </th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr
              key={post.id}
              className="border-b border-border last:border-0 hover:bg-background/50 transition-colors"
            >
              <td className="px-4 py-3 text-muted whitespace-nowrap">
                {formatDateTime(post.scheduled_at)}
              </td>
              <td className="px-4 py-3 text-muted whitespace-nowrap">
                {post.pillar || "—"}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/org/${orgId}/grilla/${post.id}`}
                  className="font-medium hover:underline"
                >
                  {post.title || "Sin título"}
                </Link>
                {post.caption && (
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">
                    {post.caption}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-muted whitespace-nowrap">
                {FORMAT_LABELS[post.format]}
              </td>
              <td className="px-4 py-3 text-center">
                {post.in_drive ? (
                  <Check size={14} className="inline text-emerald-600" />
                ) : (
                  <X size={14} className="inline text-muted/40" />
                )}
              </td>
              <td className="px-4 py-3 text-muted text-xs">
                {post.plate || "—"}
              </td>
              <td className="px-4 py-3">
                <Badge status={post.status}>
                  {STATUS_LABELS[post.status]}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {post.brief ? (
                  <Sparkles size={14} className="text-amber-500" />
                ) : (
                  <span className="text-muted/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
