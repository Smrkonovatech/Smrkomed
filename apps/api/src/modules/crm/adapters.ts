import { HttpError } from "../../lib/errors";

export interface LeadSourceAdapter {
  readonly id: string;
  ingest(payload: unknown): Promise<never>;
}

class UnimplementedLeadAdapter implements LeadSourceAdapter {
  constructor(
    readonly id: string,
    private readonly message: string,
  ) {}

  ingest(_payload: unknown): Promise<never> {
    throw new HttpError(501, "NOT_IMPLEMENTED", this.message);
  }
}

export const MetaLeadAdapter = new UnimplementedLeadAdapter(
  "META_ADS",
  "Meta Ads lead ingestion is not implemented in this phase.",
);

export const GoogleLeadAdapter = new UnimplementedLeadAdapter(
  "GOOGLE_ADS",
  "Google Ads lead ingestion is not implemented in this phase.",
);

export function getLeadSourceAdapter(id: string): LeadSourceAdapter {
  if (id === "META_ADS" || id === "META") return MetaLeadAdapter;
  if (id === "GOOGLE_ADS" || id === "GOOGLE") return GoogleLeadAdapter;
  throw new HttpError(404, "ADAPTER_NOT_FOUND", "Lead source adapter was not found.");
}
