export type Role = "ADMIN" | "MEMBER";

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email: string;
  workspaceId: string | null;
  workspace?: Pick<Workspace, "id" | "name" | "slug" | "ownerId"> | null;
  isVerified?: boolean;
  invitedById?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}
