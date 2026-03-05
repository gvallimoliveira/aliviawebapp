import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is VIP (admin)
    const { data: callerVip } = await supabaseClient
      .from("vip_users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!callerVip) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // List partners
    if (action === "list_partners") {
      const { data, error } = await supabaseClient
        .from("professionals")
        .select("id, full_name, email, city, state")
        .eq("is_partner", true)
        .order("full_name");

      if (error) throw error;
      return new Response(JSON.stringify({ partners: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set partner status
    if (action === "set_partner") {
      const { email, professional_id, is_partner } = body;

      let targetId = professional_id;

      if (!targetId && email) {
        const { data: pro } = await supabaseClient
          .from("professionals")
          .select("id")
          .eq("email", email.toLowerCase().trim())
          .maybeSingle();

        if (!pro) {
          return new Response(JSON.stringify({ error: "not_found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        targetId = pro.id;
      }

      if (!targetId) {
        return new Response(JSON.stringify({ error: "email or professional_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseClient
        .from("professionals")
        .update({
          is_partner: is_partner,
          subscription_status: is_partner ? "active" : "inactive",
        })
        .eq("id", targetId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List VIP users
    if (action === "list_vip" || !action) {
      const { data, error } = await supabaseClient
        .from("vip_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ vip_users: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add VIP user
    if (action === "add_vip") {
      const { email, notes } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseClient
        .from("vip_users")
        .insert({ email: email.toLowerCase().trim(), notes: notes || null })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return new Response(JSON.stringify({ error: "Email already in VIP list" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw error;
      }

      return new Response(JSON.stringify({ vip_user: data }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete VIP user
    if (action === "delete_vip") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseClient
        .from("vip_users")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
