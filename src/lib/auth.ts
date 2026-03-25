import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.password) {
          throw new Error("Password is required");
        }

        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "paul1234";

        if (credentials.password !== ADMIN_PASSWORD) {
          throw new Error("Invalid password");
        }

        // Find or create the default admin user
        const email = "admin@paulagent.local";
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: "Paul",
              password: await bcrypt.hash(ADMIN_PASSWORD, 12),
              role: "OWNER",
            },
          });

          // Create default company
          await prisma.company.create({
            data: {
              name: "My Company",
              members: {
                create: { userId: user.id, role: "OWNER" },
              },
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
