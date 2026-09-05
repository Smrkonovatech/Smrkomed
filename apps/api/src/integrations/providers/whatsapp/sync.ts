import { type TenantContext } from "@smrkomed/database";

import { MetaWhatsAppService } from "./service";
import {
  getTemplateVariableCatalog,
  getWhatsAppTemplateDetail,
  listApprovedWhatsAppTemplates,
  listWhatsAppTemplatesDetailed,
  previewWhatsAppTemplate,
  resolveAndValidateTemplate,
  resolveTemplateVariables,
  testSendWhatsAppTemplate,
  validateTemplateVariables,
} from "./template-ops";

export async function syncWhatsAppTemplates(ctx: TenantContext) {
  return MetaWhatsAppService.syncTemplates(ctx);
}

export async function listWhatsAppTemplates(ctx: TenantContext) {
  return MetaWhatsAppService.listTemplates(ctx);
}

export {
  listApprovedWhatsAppTemplates,
  listWhatsAppTemplatesDetailed,
  getWhatsAppTemplateDetail,
  previewWhatsAppTemplate,
  resolveAndValidateTemplate,
  resolveTemplateVariables,
  validateTemplateVariables,
  testSendWhatsAppTemplate,
  getTemplateVariableCatalog,
};

