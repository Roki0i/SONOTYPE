export type TemplateId = 'signal' | 'retro-grid' | 'lofi-player' | 'cover-focus';
export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  category: string;
  description: string;
}
export declare const TEMPLATES: readonly TemplateDefinition[];
export declare const TEMPLATE_IDS: readonly TemplateId[];
export declare function isTemplateId(id: unknown): id is TemplateId;
