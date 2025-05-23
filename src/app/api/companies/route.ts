import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

// Schema for company creation/update
const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

// Function to check if user has super admin role
async function checkSuperAdminRole(userId: string) {
  try {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: { role: true },
    });
    return profile?.role === "SUPERADMIN";
  } catch (error) {
    console.error("Failed to check user role:", error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin role
    const isSuperAdmin = await checkSuperAdminRole(session.user.id);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Requires super admin access" },
        { status: 403 }
      );
    }

    const companies = await db.company.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("[COMPANIES_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super admin role
    const isSuperAdmin = await checkSuperAdminRole(session.user.id);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Requires super admin access" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = companySchema.parse(body);

    const company = await db.company.create({
      data: {
        name: validatedData.name,
        address: validatedData.address,
        phone: validatedData.phone,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error("[COMPANIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
