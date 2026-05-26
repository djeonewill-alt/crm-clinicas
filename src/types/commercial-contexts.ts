export type CommercialContext = {
  id: string;
  empresaId: string;
  name: string;
  slug: string;
  description: string | null;
  audienceLabel: string | null;
  campaignLabel: string | null;
  priceNotes: string | null;
  paymentNotes: string | null;
  scheduleNotes: string | null;
  unitsNotes: string | null;
  safetyNotes: string | null;
  internalNotes: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialContextFormInput = {
  name: string;
  slug?: string;
  description?: string;
  audienceLabel?: string;
  campaignLabel?: string;
  priceNotes?: string;
  paymentNotes?: string;
  scheduleNotes?: string;
  unitsNotes?: string;
  safetyNotes?: string;
  internalNotes?: string;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};
