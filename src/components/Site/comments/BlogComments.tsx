"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface BlogCommentsProps {
  blogId: number;
  userId?: number; // اگر کاربر لاگین کرده باشد
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: {
    id: number | null;
    name: string;
    image_profile: string | null;
  };
  replies: Comment[];
}

export default function BlogComments({ blogId, userId }: BlogCommentsProps) {
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Honeypot field (hidden)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // دریافت نظرات تایید شده
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoadingComments(true);
        const response = await fetch(`/api/v1/public/comments?blog_id=${blogId}`);
        if (response.ok) {
          const data = await response.json();
          setComments(data);
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setLoadingComments(false);
      }
    };

    fetchComments();
  }, [blogId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setMessage({ text: "لطفاً نظر خود را وارد کنید", type: "error" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    // اگر کاربر لاگین نکرده، name و email الزامی هستند
    if (!userId && (!guestName.trim() || !guestEmail.trim())) {
      setMessage({ text: "لطفاً نام و ایمیل خود را وارد کنید", type: "error" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/public/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          blog_id: blogId,
          user_id: userId || null,
          name: userId ? null : guestName.trim(),
          email: userId ? null : guestEmail.trim(),
          honeypot: honeypot, // Honeypot field
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit comment");
      }

      setMessage({ text: "نظر شما با موفقیت ارسال شد و پس از تایید نمایش داده می‌شود", type: "success" });
      setTimeout(() => setMessage(null), 5000);
      setNewComment("");
      setGuestName("");
      setGuestEmail("");
      setHoneypot("");
      
      // Refresh comments after successful submission
      // Note: The new comment won't appear until it's approved by admin
      const refreshResponse = await fetch(`/api/v1/public/comments?blog_id=${blogId}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setComments(data);
      }
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      setMessage({ text: error.message || "خطا در ارسال نظر", type: "error" });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const getAvatarUrl = (user: Comment["user"]) => {
    if (user.image_profile) {
      return user.image_profile;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=128&bold=true`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  return (
    <div className="mt-12 pt-8 border-t border-gray-200 relative">
      {/* نمایش نظرات تایید شده */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
          نظرات ({comments.length})
        </h3>
        
        {loadingComments ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            در حال بارگذاری نظرات...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            هنوز نظری ثبت نشده است. اولین نظر را شما بنویسید!
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    <Image
                      src={getAvatarUrl(comment.user)}
                      alt={comment.user.name}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {comment.user.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                    
                    {/* نمایش پاسخ‌ها */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mr-8 mt-4 space-y-4 border-r-2 border-gray-300 dark:border-gray-600 pr-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                              <Image
                                src={getAvatarUrl(reply.user)}
                                alt={reply.user.name}
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-800 dark:text-white">
                                  {reply.user.name}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="bg-primary absolute text-white px-6 sm:px-8 right-0 py-1 font-bold rounded-tr-md rounded-tl-md text-sm sm:text-base z-10 -top-4">
        ارسال نظرات
      </h2>

      {/* Message Alert */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* فرم ارسال نظر */}
      <div className="mt-8">
        <form id="comment-form" onSubmit={handleSubmitComment} className="bg-white border border-gray-300 rounded-lg p-6">
          {!userId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* فیلد نام */}
              <div>
                <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  نام
                </label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required={!userId}
                />
              </div>
              {/* فیلد ایمیل */}
              <div>
                <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  ایمیل
                </label>
                <input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required={!userId}
                />
              </div>
            </div>
          )}
          
          {/* Honeypot field (hidden) */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />

          {/* Textarea برای نظر */}
          <div className="mb-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="لطفا نظر خود را در رابطه با اخبار مربوطه در این قسمت بنویسید ...."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 text-right resize-y focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              style={{ minHeight: '150px' }}
            />
          </div>

          {/* دکمه ارسال نظر */}
          <div className="flex justify-start">
            <button
              type="submit"
              disabled={submitting || !newComment.trim() || (!userId && (!guestName.trim() || !guestEmail.trim()))}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  در حال ارسال...
                </>
              ) : (
                <>
                  ارسال نظر
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

