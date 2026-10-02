import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import {
  getContact,
  listContacts,
  type Contact,
} from "../zoho/contacts.js";
import { toPagination } from "../zoho/pagination.js";

function toAgentContact(contact: Contact) {
  return {
    id: String(contact.contact_id),
    name: contact.contact_name ?? null,
    company: contact.company_name ?? null,
    first_name: contact.first_name ?? null,
    last_name: contact.last_name ?? null,
    type: contact.contact_type ?? null,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    mobile: contact.mobile ?? null,
    status: contact.status ?? null,
    currency: contact.currency_code ?? null,
    outstanding_receivable: contact.outstanding_receivable_amount ?? null,
    created_at: contact.created_time ?? null,
    updated_at: contact.last_modified_time ?? null,
  };
}

export function registerContactTools(server: McpServer): void {
  server.registerTool(
    "list_contacts",
    {
      title: "List Contacts",
      description:
        "List contacts from the authenticated Zoho Inventory organization. " +
        "Results are paginated and read-only.",
      inputSchema: z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(200).default(50),
        status: z.string().optional().describe("Optional Zoho contact status filter."),
      }),
    },
    async ({ page, perPage, status }) => {
      const result = await listContacts({ page, perPage, status });
      const output = {
        contacts: result.contacts.map(toAgentContact),
        pagination: toPagination(result.page_context, page, perPage),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );

  server.registerTool(
    "search_contacts",
    {
      title: "Search Contacts",
      description:
        "Search Zoho Inventory contacts by name, company, email, phone, " +
        "or Zoho's searchable contact text.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(100)
          .describe("Search term such as a contact name, company, email, or phone."),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(200).default(50),
      }),
    },
    async ({ query, page, perPage }) => {
      const result = await listContacts({ page, perPage, searchText: query });
      const output = {
        query,
        contacts: result.contacts.map(toAgentContact),
        pagination: toPagination(result.page_context, page, perPage),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );

  server.registerTool(
    "get_contact",
    {
      title: "Get Contact",
      description:
        "Retrieve detailed information about a single Zoho Inventory contact by ID.",
      inputSchema: z.object({
        contactId: z.string().min(1).describe("Zoho Inventory contact ID."),
      }),
    },
    async ({ contactId }) => {
      const result = await getContact(contactId);
      const output = { contact: toAgentContact(result.contact) };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );
}
