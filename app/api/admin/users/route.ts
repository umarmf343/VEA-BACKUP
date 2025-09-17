import { NextRequest, NextResponse } from "next/server";

import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
  type CreateAdminUserInput,
  type UpdateAdminUserInput,
  type UserRole,
} from "@/lib/admin-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const users = listAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateAdminUserInput>;
    if (!body?.name || !body?.email || !body?.role) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
    }

    const user = createAdminUser({
      name: body.name,
      email: body.email,
      role: body.role as UserRole,
      assignedClasses: body.assignedClasses,
      assignedSubjects: body.assignedSubjects,
      parentId: body.parentId,
      studentIds: body.studentIds,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Admin user create error:", error);
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string; updates?: UpdateAdminUserInput };
    if (!body?.id || !body?.updates) {
      return NextResponse.json({ error: "User id and updates are required" }, { status: 400 });
    }

    const user = updateAdminUser(body.id, body.updates);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Admin user update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string };
    if (!body?.id) {
      return NextResponse.json({ error: "User id is required" }, { status: 400 });
    }

    const user = deleteAdminUser(body.id);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Admin user delete error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
