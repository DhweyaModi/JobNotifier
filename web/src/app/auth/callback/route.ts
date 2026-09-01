import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Support forwarded host headers for production environments like Vercel
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const redirectBase = isLocalEnv ? origin : (forwardedHost ? `https://${forwardedHost}` : origin);

  if (code && supabase) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        // Sync user to public.users table
        const email = data.user.email || "";
        const name =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          email.split("@")[0] ||
          "User";
        const avatarUrl =
          data.user.user_metadata?.avatar_url ||
          data.user.user_metadata?.picture ||
          "";

        await supabase.from("users").upsert(
          {
            id: data.user.id,
            email: email,
            name: name,
            avatar_url: avatarUrl,
            platform: "web",
            last_sign_in_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }
    } catch (err) {
      console.error("Error exchanging OAuth code for session:", err);
    }
  }

  // Redirect to home page or destination route
  return NextResponse.redirect(`${redirectBase}${next}`);
}
