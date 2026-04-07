export type Role = "ADMIN" | "MEMBER";

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email: string;
}
