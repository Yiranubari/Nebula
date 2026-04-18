export type Role = "ADMIN" | "MEMBER";

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email: string;
  /** true once the account's email has been verified via OTP */
  isVerified?: boolean;
  /** set for accounts that were pre-created via an admin invite */
  invitedById?: string | null;
}
