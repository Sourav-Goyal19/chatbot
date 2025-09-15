import client from "@/lib/prismadb";
import { isValidObjectId } from "mongoose";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      versionGroupId: string;
    }>;
  }
) {
  try {
    const { versionGroupId } = await params;
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorize",
        },
        {
          status: 401,
        }
      );
    }

    if (!isValidObjectId(versionGroupId)) {
      return NextResponse.json(
        {
          error: "Invalid Version Group Id",
        },
        {
          status: 400,
        }
      );
    }

    await client.versionGroup.delete({
      where: {
        id: versionGroupId,
      },
    });

    return NextResponse.json(
      {
        message: "Version Group Deleted Successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("VersionGroup[DELETE]:", error);
    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
}
