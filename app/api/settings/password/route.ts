import { getSessionFromRequest } from "@/lib/auth/session";
import { updateUserPassword } from "@/lib/auth/users-db";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session || !session.user) {
    return Response.json(
      { error: "unauthorized", message: "You must be signed in to change your password." },
      { status: 401 }
    );
  }

  let body: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  try {
    body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
  } catch {
    return Response.json(
      { error: "invalid_request", message: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const currentPassword = body.currentPassword || "";
  const newPassword = body.newPassword || "";
  const confirmPassword = body.confirmPassword;

  if (!currentPassword || !newPassword) {
    return Response.json(
      {
        error: "missing_fields",
        message: "Both current password and new password are required.",
      },
      { status: 400 }
    );
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return Response.json(
      {
        error: "password_mismatch",
        message: "New password and confirmation password do not match.",
      },
      { status: 400 }
    );
  }

  const result = await updateUserPassword(
    session.user.id,
    currentPassword,
    newPassword
  );

  if (!result.success) {
    return Response.json(
      {
        error: "password_update_failed",
        message: result.error || "Failed to update password.",
      },
      { status: 400 }
    );
  }

  return Response.json(
    {
      success: true,
      message: "Password updated successfully.",
      updatedAt: result.user?.updatedAt,
    },
    { status: 200 }
  );
}
