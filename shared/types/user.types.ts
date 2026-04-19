export type Role = "ADMIN" | "MEMBER";

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email: string;
  /** Tenant — the workspace this user belongs to. */
  workspaceId: string | null;
  /** Populated by /users/me and other endpoints that include the relation. */
  workspace?: Pick<Workspace, "id" | "name" | "slug" | "ownerId"> | null;
  /** true once the account's email has been verified via OTP */
  isVerified?: boolean;
  /** set for accounts that were pre-created via an admin invite */
  invitedById?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}
