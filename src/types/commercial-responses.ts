export type CommercialResponseCategory = {
  id: string;
  empresaId: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type CommercialResponse = {
  id: string;
  empresaId: string;
  categoryId?: string | null;
  contextId: string | null;
  title: string;
  answerText: string;
  exampleQuestions: string[];
  tags: string[];
  isActive: boolean;
  canAutoReply: boolean;
  requiresHuman: boolean;
  internalNotes?: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type CommercialResponseCategoryFormInput = {
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  orderIndex?: number;
};

export type CommercialResponseFormInput = {
  categoryId?: string | null;
  contextId?: string | null;
  title: string;
  answerText: string;
  exampleQuestions?: string[];
  tags?: string[];
  isActive?: boolean;
  canAutoReply?: boolean;
  requiresHuman?: boolean;
  internalNotes?: string;
  priority?: number;
};
