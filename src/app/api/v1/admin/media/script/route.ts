import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function verifyJWT() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) throw new Error("No session token");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const { payload } = await jwtVerify(token, secret);
  if (payload.role !== "Admin") throw new Error("Unauthorized");
  return payload;
}

export async function POST(req: Request) {
  try {
    await verifyJWT();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file extension
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["js", "txt"];
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: "فایل باید از نوع .js یا .txt باشد" },
        { status: 400 }
      );
    }

    // Check file size (5MB limit for script files)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "حجم فایل باید کمتر از 5MB باشد" },
        { status: 400 }
      );
    }

    // Read file content as text
    const fileContent = await file.text();

    return NextResponse.json({ 
      content: fileContent,
      filename: file.name,
      size: file.size
    });
  } catch (error) {
    console.error("Error uploading script file:", error);
    if (error instanceof Error && error.message === "No session token") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

