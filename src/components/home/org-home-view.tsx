import { PendientesList } from "./pendientes-list";
import {
  OrgHomeHeader,
  HomeMainLayout,
  SectionCard,
} from "./home-ui";
import { OrgQuickNav } from "./org-quick-nav";
import { ReviewGallery } from "./review-gallery";
import { EditorialCadenceAlerts } from "./editorial-cadence-alerts";
import { TeamAvatarRow } from "./team-avatar-row";
import { QuincenaProgressCards } from "./quincena-progress-cards";
import { buildQuincenaProgressCards } from "@/lib/quincena-progress";
import type { HomeStats, ReviewPostItem, TeamMemberPreview } from "@/lib/home-data";
import type { QuincenaBoardSnapshot } from "@/lib/editorial-quincena";
import type { MemberRole } from "@/lib/types";
import type { TaskWithPost } from "@/lib/task-due";

interface OrgHomeViewProps {
  orgId: string;
  orgName: string;
  profileName: string;
  editorialRoles: MemberRole[];
  quincenaBoards: QuincenaBoardSnapshot[];
  currentUserId: string;
  stats: HomeStats;
  tasks: TaskWithPost[];
  urgentTasks: TaskWithPost[];
  reviewPosts: ReviewPostItem[];
  teamMembers?: TeamMemberPreview[];
}

export function OrgHomeView({
  orgId,
  orgName,
  profileName,
  editorialRoles,
  quincenaBoards,
  currentUserId,
  stats,
  tasks = [],
  urgentTasks = [],
  reviewPosts = [],
  teamMembers = [],
}: OrgHomeViewProps) {
  const quincenaCards = buildQuincenaProgressCards({
    boards: quincenaBoards,
    roles: editorialRoles,
  });

  return (
    <HomeMainLayout>
      <OrgHomeHeader
        orgName={orgName}
        teamRow={
          teamMembers.length > 0 ? (
            <TeamAvatarRow
              members={teamMembers}
              teamHref={`/org/${orgId}/team`}
              label="Equipo"
            />
          ) : undefined
        }
      />

      <EditorialCadenceAlerts
        firstName={profileName}
        roles={editorialRoles}
        quincenaBoards={quincenaBoards}
        orgId={orgId}
        currentUserId={currentUserId}
        urgentTaskCount={urgentTasks.length}
        pendingTaskCount={stats.tasksOpen}
        storageKey={`org-editorial-alert-${orgId}`}
      />

      <OrgQuickNav orgId={orgId} />

      {quincenaCards.length > 0 && (
        <SectionCard title="Quincena en curso">
          <QuincenaProgressCards cards={quincenaCards} />
        </SectionCard>
      )}

      <SectionCard title="En revisión">
        <ReviewGallery posts={reviewPosts} />
      </SectionCard>

      <SectionCard title="Pendientes">
        <PendientesList tasks={tasks} />
      </SectionCard>
    </HomeMainLayout>
  );
}
