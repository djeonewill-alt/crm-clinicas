"use client";

import { NewLeadForm } from "@/components/comercial/NewLeadForm";
import { FunnelStatCards } from "@/components/comercial/FunnelStatCards";
import { LeadQueue } from "@/components/comercial/LeadQueue";
import { LeadDetail } from "@/components/comercial/LeadDetail";
import { ComercialWorkHeader } from "@/components/comercial/ComercialWorkHeader";
import { useComercialTrabalho } from "@/components/comercial/useComercialTrabalho";
import type { Lead } from "@/types/lead";

type ComercialTrabalhoClientProps = {
  initialLeads: Lead[];
  empresaId: string | number;
  empresaNome: string;
};

export function ComercialTrabalhoClient({
  initialLeads,
  empresaId,
  empresaNome,
}: ComercialTrabalhoClientProps) {
  const comercial = useComercialTrabalho({
    initialLeads,
    empresaId,
  });

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <LeadQueue
        workFunnel={comercial.workFunnel}
        activeFunnelLabel={comercial.activeFunnel.label}
        queuesByFunnel={comercial.queuesByFunnel}
        queueLeads={comercial.filteredLeads}
        hiddenCount={comercial.hiddenCount}
        selectedLeadId={comercial.selectedLead?.id ?? null}
        listMode={comercial.listMode}
        onChangeFunnel={comercial.handleChangeFunnel}
        onChangeListMode={comercial.setListMode}
        onSelectLead={comercial.setSelectedLeadId}
        getLeadName={comercial.getLeadName}
        getLastAction={comercial.getLastAction}
      />

      <section className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        <ComercialWorkHeader
          empresaNome={empresaNome}
          activeFunnel={comercial.activeFunnel}
          queueCount={comercial.queueCount}
          hiddenCount={comercial.hiddenCount}
          message={comercial.message}
          onToggleNewLeadForm={() =>
            comercial.setShowNewLeadForm((current) => !current)
          }
        />

        {comercial.showNewLeadForm && (
          <NewLeadForm
            name={comercial.newLeadName}
            phone={comercial.newLeadPhone}
            interest={comercial.newLeadInterest}
            campaign={comercial.newLeadCampaign}
            isSaving={comercial.savingLeadId === "new-lead"}
            onNameChange={comercial.setNewLeadName}
            onPhoneChange={comercial.setNewLeadPhone}
            onInterestChange={comercial.setNewLeadInterest}
            onCampaignChange={comercial.setNewLeadCampaign}
            onSave={comercial.handleCreateLead}
            onCancel={() => comercial.setShowNewLeadForm(false)}
          />
        )}

        <FunnelStatCards
          workFunnel={comercial.workFunnel}
          queuesByFunnel={comercial.queuesByFunnel}
          rawCounts={comercial.rawCounts}
          onChangeFunnel={comercial.handleChangeFunnel}
        />

        <LeadDetail
          lead={comercial.selectedLead}
          savingLeadId={comercial.savingLeadId}
          retornoDate={comercial.retornoDate}
          onRetornoDateChange={comercial.setRetornoDate}
          onPreviousDay={comercial.handlePreviousDay}
          onMoveToQualificacao={comercial.handleMoveToQualificacao}
          onCloseClient={comercial.handleCloseClient}
          onDisqualify={comercial.handleDisqualify}
          onMoveToRetorno={comercial.handleMoveToRetorno}
          onSetResultado={comercial.handleSetResultado}
          onAdvanceQueue={comercial.handleAdvanceQueue}
          getLastAction={comercial.getLastAction}
        />
      </section>
    </div>
  );
}
