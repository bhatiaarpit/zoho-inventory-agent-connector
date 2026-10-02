import { zohoRequest } from "./client.js";

export interface ZohoOrganization {
  organization_id: string;
  name: string;
  currency_code?: string;
  currency_symbol?: string;
  time_zone?: string;
  is_default_org?: boolean;
  is_org_active?: boolean;
}

interface OrganizationsResponse {
  code: number;
  message: string;
  organizations: ZohoOrganization[];
}

export async function listOrganizations() {
  return zohoRequest<OrganizationsResponse>("/organizations");
}
