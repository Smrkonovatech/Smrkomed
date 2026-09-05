import { type TenantContext } from "@smrkomed/database";

import { MetaWhatsAppService } from "./service";

export async function syncWhatsAppTemplates(ctx: TenantContext) {
  return MetaWhatsAppService.syncTemplates(ctx);
}

export async function listWhatsAppTemplates(ctx: TenantContext) {
  return MetaWhatsAppService.listTemplates(ctx);
}

