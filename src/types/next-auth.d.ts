import "next-auth";

declare module "next-auth" {
  interface Session {
    familyId: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    familyId?: string;
  }
}
