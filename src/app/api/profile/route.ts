import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import type { UserRole, Prisma } from "@prisma/client";

// GET: Fetch profile for the current authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch profile from the database
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT: Update profile for the current authenticated user
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();
    const { firstName, lastName, avatarUrl, active } = data;

    // Update profile in the database
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        firstName,
        lastName,
        avatarUrl,
        active,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// POST: Create a new profile for the current authenticated user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, firstName, lastName, avatarUrl } = data;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // If userId is provided directly (during signup flow)
    try {
      // Check if profile already exists
      const existingProfile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        return NextResponse.json(
          { error: "Profile already exists" },
          { status: 409 }
        );
      }

      // Create profile in the database
      const newProfile = await prisma.profile.create({
        data: {
          userId,
          firstName: firstName || null,
          lastName: lastName || null,
          avatarUrl: avatarUrl || null,
          role: "USER", // This field has a default in the schema but we set it explicitly
          active: true, // This field has a default in the schema but we set it explicitly
        },
      });

      return NextResponse.json(newProfile, { status: 201 });
    } catch (dbError) {
      console.error("Database error creating profile:", dbError);
      const errorMessage =
        dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json(
        { error: "Database error creating profile", details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in profile creation endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create profile", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GETAll(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const active = searchParams.get("active");

    const whereClause: Prisma.ProfileWhereInput = {};

    if (role) whereClause.role = role as UserRole;
    if (active !== null) whereClause.active = active === "true";

    const profiles = await prisma.profile.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
