import { NextResponse } from "next/server";
import { prisma } from "@/lib/core/prisma";

// ?????? ????? ?? ????
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blogId = searchParams.get("blog_id");

    if (!blogId) {
      return NextResponse.json(
        { error: "blog_id is required" },
        { status: 400 }
      );
    }

    const blogIdNum = parseInt(blogId);
    if (isNaN(blogIdNum)) {
      return NextResponse.json(
        { error: "Invalid blog_id" },
        { status: 400 }
      );
    }

    const comments = await prisma.blogComment.findMany({
      where: {
        blog_id: blogIdNum,
        status: "APPROVED",
        parent_id: null, // ??? ????? ???? (???? ????)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image_profile: true,
          },
        },
        replies: {
          where: {
            status: "APPROVED",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image_profile: true,
              },
            },
          },
          orderBy: {
            created_at: "asc",
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Format comments for response
    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      user: comment.user
        ? {
            id: comment.user.id,
            name: comment.user.name,
            image_profile: comment.user.image_profile,
          }
        : {
            id: null,
            name: comment.name || "??????",
            image_profile: null,
          },
      replies: comment.replies?.map((reply) => ({
        id: reply.id,
        content: reply.content,
        created_at: reply.created_at,
        user: reply.user
          ? {
              id: reply.user.id,
              name: reply.user.name,
              image_profile: reply.user.image_profile,
            }
          : {
              id: null,
              name: reply.name || "??????",
              image_profile: null,
            },
      })) || [],
    }));

    return NextResponse.json(formattedComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ????? ??? ????
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, blog_id, user_id, parent_id, name, email, honeypot } = body;

    // ?????? IP address
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";

    // ????? anti-spam
    const { checkSpam } = await import("@/lib/security/anti-spam");
    const isLoggedIn = !!user_id;
    const spamCheck = await checkSpam(
      content || "",
      email || "",
      name || "",
      ipAddress,
      honeypot,
      isLoggedIn
    );

    if (spamCheck.isSpam) {
      // ??? ???? ???? spam ???? debugging
      console.log("?? Spam detected:", {
        reason: spamCheck.reason,
        isLoggedIn,
        contentLength: content?.length,
        hasEmail: !!email,
        hasName: !!name,
        ipAddress,
      });
      
      // ???? ???? ???? ?? ???? ????
      let errorMessage = "??? ??? ?? ????? spam ??????? ??. ????? ?????? ???? ????.";
      if (spamCheck.reason === "Content too short") {
        errorMessage = "??? ??? ???? ????? ???. ????? ??? ???????? ??????? (????? 10 ???????).";
      } else if (spamCheck.reason === "Content too long") {
        errorMessage = "??? ??? ???? ???? ???. ????? ??? ????????? ??????? (?????? 2000 ???????).";
      } else if (spamCheck.reason === "Invalid email format") {
        errorMessage = "????? ???? ??? ????? ????. ????? ?? ????? ????? ???? ????.";
      } else if (spamCheck.reason === "Invalid name") {
        errorMessage = "??? ???? ??? ????? ????. ????? ?? ??? ????? ???? ???? (????? 2 ???????).";
      } else if (spamCheck.reason === "Too many requests from this IP") {
        errorMessage = "????? ??????????? ??? ??? ?? ?? ???? ???. ????? ??? ????? ??? ???? ? ?????? ???? ????.";
      } else if (spamCheck.reason === "Too many URLs in content") {
        errorMessage = "????? ???????? ????? ?? ??? ??? ??? ?? ?? ???? ???.";
      }
      
      return NextResponse.json(
        { error: errorMessage, reason: spamCheck.reason },
        { status: 400 }
      );
    }

    if (!content || !blog_id) {
      return NextResponse.json(
        { error: "content ? blog_id ?????? ?????" },
        { status: 400 }
      );
    }

    // ????? ???? ????
    const blog = await prisma.blog.findUnique({
      where: { id: parseInt(blog_id) },
    });

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // ??? user_id ???? ????? ????? ???? ?????
    let user = null;
    if (user_id) {
      user = await prisma.user.findUnique({
        where: { id: parseInt(user_id) },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } else {
      // ??? user_id ???? ?????? name ? email ?????? ?????
      if (!name || !email) {
        return NextResponse.json(
          { error: "name ? email ???? ??????? ????? ?????? ?????" },
          { status: 400 }
        );
      }
    }

    // ??? parent_id ???? ????? ????? ???? ????? ????
    if (parent_id) {
      const parentComment = await prisma.blogComment.findUnique({
        where: { id: parseInt(parent_id) },
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    const comment = await prisma.blogComment.create({
      data: {
        content: content.trim(),
        blog_id: parseInt(blog_id),
        user_id: user_id ? parseInt(user_id) : null,
        name: user_id ? null : (name || null),
        email: user_id ? null : (email || null),
        ip_address: ipAddress,
        parent_id: parent_id ? parseInt(parent_id) : null,
        status: "PENDING",
      },
      include: {
        user: user_id
          ? {
              select: {
                id: true,
                name: true,
                image_profile: true,
              },
            }
          : undefined,
        blog: {
          include: {
            translations: {
              where: { lang: "FA" },
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    // ????? Notification ???? ????? ????
    try {
      const { createNotification } = await import("@/lib/notification-helper");
      const blogTitle = comment.blog.translations[0]?.title || `???? #${blog_id}`;
      const commentAuthor = comment.user?.name || comment.name || "??????";
      
      await createNotification({
        title: "?? ??? ???? ?????? ??",
        message: `${commentAuthor} ?? ??? ???? ???? "${blogTitle.substring(0, 50)}${blogTitle.length > 50 ? '...' : ''}" ????? ???? ???.`,
        type: "info",
        link: `/admin/comments?status=PENDING`,
      });
    } catch (notificationError) {
      // ??? ????? notification ?? ??? ????? ??? ??? ?? ??? ??????? ??? ???? ?? ????????????
      console.error("Error creating notification for comment:", notificationError);
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

