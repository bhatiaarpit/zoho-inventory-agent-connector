import "dotenv/config";

type Organization = {
  organization_id?: string | number;
  name?: string;
};

type OrganizationsResponse = {
  code?: number;
  message?: string;
  organizations?: Organization[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const accessToken = process.env.ZOHO_ACCESS_TOKEN?.trim();

if (!accessToken) {
  console.error("Missing ZOHO_ACCESS_TOKEN in .env.");
  process.exitCode = 1;
} else {
  const baseUrl = (
    process.env.ZOHO_API_BASE_URL ?? "https://www.zohoapis.in/inventory/v1"
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(`${baseUrl}/organizations`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });
    const payload: unknown = await response.json();

    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload.message === "string"
          ? `: ${payload.message}`
          : "";
      throw new Error(`Zoho API request failed with HTTP ${response.status}${message}`);
    }

    if (!isRecord(payload) || !Array.isArray(payload.organizations)) {
      throw new Error("Zoho returned an unexpected organizations response.");
    }

    const organizations = payload.organizations as Organization[];

    if (organizations.length === 0) {
      console.log("No organizations found.");
    } else {
      for (const organization of organizations) {
        if (organization.organization_id === undefined) {
          throw new Error("An organization response is missing organization_id.");
        }

        const name = organization.name ?? "Unnamed organization";
        console.log(`${name}: ${organization.organization_id}`);
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Zoho API request failed.");
    process.exitCode = 1;
  }
}
