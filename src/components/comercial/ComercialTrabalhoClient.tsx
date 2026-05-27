"use client";

import { NewLeadForm } from "@/components/comercial/NewLeadForm";
import { FunnelStatCards } from "@/components/comercial/FunnelStatCards";
import { LeadQueue } from "@/components/comercial/LeadQueue";
import { LeadDetail } from "@/components/comercial/LeadDetail";
import { ComercialWorkHeader } from "@/components/comercial/ComercialWorkHeader";
import { useComercialTrabalho } from "@/components/comercial/useComercialTrabalho";
import type {
  CommercialResponse,
  CommercialResponseCategory,
} from "@/types/commercial-responses";
import type { CommercialContext } from "@/types/commercial-contexts";
import type { Lead } from "@/types/lead";

type ComercialTrabalhoClientProps = {
  initialLeads: Lead[];
  empresaId: string | number;
  empresaNome: string;
  commercialResponseCategories: CommercialResponseCategory[];
  commercialResponses: CommercialResponse[];
  commercialContexts: CommercialContext[];
};

export function ComercialTrabalhoClient({
  initialLeads,
  empresaId,
  empresaNome,
  commercialResponseCategories,
  commercialResponses,
  commercialContexts,
}: ComercialTrabalhoClientProps) {
  const comercial = useComercialTrabalho({
    initialLeads,
    empresaId,
    commercialContexts,
  });

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <LeadQueue
        workFunnel={comercial.workFunnel}
        activeFunnelLabel={comercial.activeFunnel.label}
        queuesByFunnel={comercial.queuesByFunnel}
        queueLeads={comercial.filteredLeads}
        hiddenCount={comercial.hiddenCount}
        filteredCount={comercial.filteredCount}
        selectedLeadId={comercial.selectedLead?.id ?? null}
        listMode={comercial.listMode}
        search={comercial.search}
        selectedCampaign={comercial.selectedCampaign}
        campaignOptions={comercial.campaignOptions}
        selectedInterest={comercial.selectedInterest}
        interestOptions={comercial.interestOptions}
        hasActiveFilters={comercial.hasActiveFilters}
        onChangeFunnel={comercial.handleChangeFunnel}
        onChangeListMode={comercial.setListMode}
        onSearchChange={comercial.setSearch}
        onCampaignChange={comercial.setSelectedCampaign}
        onInterestChange={comercial.setSelectedInterest}
        onClearFilters={comercial.clearFilters}
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
            suggestedContextName={comercial.newLeadSuggestedContext?.name ?? null}
            contextSuggestionMessage={comercial.newLeadContextSuggestionMessage}
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
          empresaId={empresaId}
          savingLeadId={comercial.savingLeadId}
          retornoDate={comercial.retornoDate}
          leadHistory={comercial.leadHistory}
          isLoadingLeadHistory={comercial.isLoadingLeadHistory}
          isSavingLeadHistory={comercial.isSavingLeadHistory}
          leadHistoryError={comercial.leadHistoryError}
          onRetornoDateChange={comercial.setRetornoDate}
          onPreviousDay={comercial.handlePreviousDay}
          onMoveToQualificacao={comercial.handleMoveToQualificacao}
          onCloseClient={comercial.handleCloseClient}
          onDisqualify={comercial.handleDisqualify}
          onArchiveLead={() => {
            if (comercial.selectedLead) {
              void comercial.handleArchiveLead(comercial.selectedLead);
            }
          }}
          onSendToRecovery={() => {
            if (comercial.selectedLead) {
              void comercial.handleArchiveLead(comercial.selectedLead, {
                recovery: true,
                source: "journey_card",
                reason: "cadence_exhausted",
                skipConfirm: true,
              });
            }
          }}
          onMoveToRetorno={comercial.handleMoveToRetorno}
          onUpdateLeadDetails={comercial.handleUpdateLeadDetails}
          onSetResultado={comercial.handleSetResultado}
          onMarkNextLeadAttempt={comercial.handleMarkNextLeadAttempt}
          onCreateLeadNote={comercial.handleCreateLeadNote}
          onRefreshLeadHistory={comercial.loadLeadHistory}
          onAdvanceQueue={comercial.handleAdvanceQueue}
          getLastAction={comercial.getLastAction}
          commercialResponseCategories={commercialResponseCategories}
          commercialResponses={commercialResponses}
          commercialContexts={commercialContexts}
          onUpdateCommercialContext={comercial.handleUpdateCommercialContext}
        />
      </section>
    </div>
  );
}
