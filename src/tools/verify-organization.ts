import "dotenv/config";
import { listOrganizations } from "../zoho/organizations.js";

try {
  const response = await listOrganizations();

  if (response.organizations.length === 0) {
    console.log("No organizations found.");
  } else {
    for (const organization of response.organizations) {
      console.log(`${organization.name}: ${organization.organization_id}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Zoho API request failed.");
  process.exitCode = 1;
}
