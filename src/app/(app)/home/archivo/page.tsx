import { SubPageHeader, EmptyState, SectionCard } from "@/components/home/home-ui";

export default function ArchivoPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <SubPageHeader title="Archivo" />
      <SectionCard title="Próximamente">
        <EmptyState text="Esta sección estará disponible pronto." />
      </SectionCard>
    </div>
  );
}
