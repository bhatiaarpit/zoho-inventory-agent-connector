import { zohoRequest } from "./client.js";

export interface Contact {
  contact_id: string | number;
  contact_name?: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  contact_type?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  status?: string;
  currency_code?: string;
  outstanding_receivable_amount?: number;
  created_time?: string;
  last_modified_time?: string;
}

export interface ListContactsResponse {
  code: number;
  message: string;
  contacts: Contact[];
  page_context?: {
    page: number;
    per_page: number;
    has_more_page: boolean;
  };
}

export interface GetContactResponse {
  code: number;
  message: string;
  contact: Contact;
}

export interface ListContactsParams {
  page?: number;
  perPage?: number;
  searchText?: string;
  contactName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  status?: string;
}

export async function listContacts(
  params: ListContactsParams = {},
): Promise<ListContactsResponse> {
  return zohoRequest<ListContactsResponse>(
    "contacts",
    { method: "GET" },
    {
      page: params.page ?? 1,
      per_page: params.perPage ?? 50,
      search_text: params.searchText,
      contact_name: params.contactName,
      company_name: params.companyName,
      email: params.email,
      phone: params.phone,
      filter_by: params.status,
    },
  );
}

export async function getContact(contactId: string): Promise<GetContactResponse> {
  return zohoRequest<GetContactResponse>(
    `contacts/${encodeURIComponent(contactId)}`,
    { method: "GET" },
  );
}
