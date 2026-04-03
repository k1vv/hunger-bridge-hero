import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type UserRoleSummary = Pick<Tables<"user_roles">, "role">;
type ReporterSummary = Pick<Tables<"profiles">, "name" | "email" | "phone" | "business_name"> & {
  role?: string;
};

export type ProfileWithRoles = Tables<"profiles"> & {
  user_roles: UserRoleSummary[];
};

export type ComplaintWithReporter = Tables<"complaints"> & {
  reporter: ReporterSummary | null;
};

export async function fetchProfilesWithRoles(verificationStatus?: string): Promise<ProfileWithRoles[]> {
  const profilesQuery = verificationStatus
    ? supabase
        .from("profiles")
        .select("*")
        .eq("verification_status", verificationStatus)
        .order("created_at", { ascending: false })
    : supabase.from("profiles").select("*").order("created_at", { ascending: false });

  const { data: profiles, error: profilesError } = await profilesQuery;

  if (profilesError) {
    throw profilesError;
  }

  const userIds = profiles.map((profile) => profile.id);

  if (userIds.length === 0) {
    return [];
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);

  if (rolesError) {
    throw rolesError;
  }

  const rolesByUserId = new Map<string, UserRoleSummary[]>();

  for (const role of roles) {
    const existingRoles = rolesByUserId.get(role.user_id) ?? [];
    existingRoles.push({ role: role.role });
    rolesByUserId.set(role.user_id, existingRoles);
  }

  return profiles.map((profile) => ({
    ...profile,
    user_roles: rolesByUserId.get(profile.id) ?? [],
  }));
}

export async function fetchComplaintsWithReporter(): Promise<ComplaintWithReporter[]> {
  const { data: complaints, error: complaintsError } = await supabase
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false });

  if (complaintsError) {
    throw complaintsError;
  }

  const reporterIds = [...new Set(complaints.map((complaint) => complaint.reporter_id))];

  if (reporterIds.length === 0) {
    return complaints.map((complaint) => ({
      ...complaint,
      reporter: null,
    }));
  }

  const { data: reporters, error: reportersError } = await supabase
    .from("profiles")
    .select("id, name, email, phone, business_name")
    .in("id", reporterIds);

  if (reportersError) {
    throw reportersError;
  }

  // Fetch roles for reporters
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", reporterIds);

  if (rolesError) {
    throw rolesError;
  }

  const rolesByUserId = new Map<string, string>(
    roles.map((r) => [r.user_id, r.role])
  );

  const reportersById = new Map<string, ReporterSummary>(
    reporters.map((reporter) => [
      reporter.id,
      {
        name: reporter.name,
        email: reporter.email,
        phone: reporter.phone,
        business_name: reporter.business_name,
        role: rolesByUserId.get(reporter.id),
      },
    ])
  );

  return complaints.map((complaint) => ({
    ...complaint,
    reporter: reportersById.get(complaint.reporter_id) ?? null,
  }));
}