import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-VIP] ${step}${d}`);
};

const findAuthUserByEmail = async (supabaseClient: any, email: string) => {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const user = data?.users?.find((candidate: any) =>
      candidate.email?.toLowerCase().trim() === email,
    );

    if (user) return user;
    if (!data?.users?.length || data.users.length < 200) break;
  }

  return null;
};

const getAvailableTemporaryCrefito = async (supabaseClient: any, seed: string) => {
  const encoder = new TextEncoder();

  for (let attempt = 0; attempt < 20; attempt++) {
    const input = encoder.encode(`${seed}:${attempt}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", input);
    const hashBytes = new Uint8Array(hashBuffer);
    const number = (((hashBytes[0] << 16) | (hashBytes[1] << 8) | hashBytes[2]) % 900000) + 100000;
    const crefito = `${number}-X`;

    const { data: existing, error } = await supabaseClient
      .from("professionals")
      .select("id")
      .eq("crefito", crefito)
      .maybeSingle();

    if (error) throw error;
    if (!existing) return crefito;
  }

  throw new Error("Unable to generate unique temporary CREFITO");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Request received", { method: req.method });
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
      log("set_partner", { email, professional_id, is_partner });

      let targetId = professional_id;

      if (!targetId && email) {
        const normalizedEmail = email.toLowerCase().trim();

        const { data: pro, error: proErr } = await supabaseClient
          .from("professionals")
          .select("id")
          .eq("email", normalizedEmail)
          .maybeSingle();

        log("Professional lookup", { found: !!pro, error: proErr?.message });

        if (pro) {
          targetId = pro.id;
        } else if (is_partner) {
          // Professional not found — auto-create account + professional profile
          // 1. Create auth user with default password
          const { data: newUserData, error: createError } = await supabaseClient.auth.admin.createUser({
            email: normalizedEmail,
            password: "parceiroalivia",
            email_confirm: true,
          });

          if (createError) {
            // If user already exists in auth but not in professionals
            if (createError.message?.includes("already been registered")) {
              // Try to find existing auth user by email
              const { data: existingUsers, error: listErr } = await supabaseClient.auth.admin.listUsers({
                filter: normalizedEmail,
                page: 1,
                perPage: 1,
              });
              const existingUser = existingUsers?.users?.[0];
              if (!existingUser) {
                return new Response(JSON.stringify({ error: createError.message }), {
                  status: 400,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
              // Create professional profile for existing auth user
              const namePart = normalizedEmail.split("@")[0].replace(/[._-]/g, " ");
              const { data: newPro, error: insertErr } = await supabaseClient
                .from("professionals")
                .insert({
                  user_id: existingUser.id,
                  email: normalizedEmail,
                  full_name: namePart,
                  crefito: "000000-X",
                  city: "A definir",
                  state: "XX",
                  is_partner: true,
                  approved: true,
                  subscription_status: "active",
                })
                .select("id")
                .single();

              if (insertErr) throw insertErr;

              return new Response(JSON.stringify({ success: true, created: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            throw createError;
          }

          const newUserId = newUserData.user.id;
          const namePart = normalizedEmail.split("@")[0].replace(/[._-]/g, " ");

          // 2. Create professional profile (profile is auto-created by handle_new_user trigger)
          const { data: newPro, error: insertErr } = await supabaseClient
            .from("professionals")
            .insert({
              user_id: newUserId,
              email: normalizedEmail,
              full_name: namePart,
              crefito: "000000-X",
              city: "A definir",
              state: "XX",
              is_partner: true,
              approved: true,
              subscription_status: "active",
            })
            .select("id")
            .single();

          if (insertErr) throw insertErr;

          return new Response(JSON.stringify({ success: true, created: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({ error: "not_found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
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

    // List leads (basic assessments with patient_email)
    if (action === "list_leads") {
      // Fetch basic leads
      const { data, error } = await supabaseClient
        .from("assessments")
        .select("id, patient_email, created_at, status, pain_score, pain_regions")
        .eq("type", "basic")
        .not("patient_email", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Conversion metrics: count premium assessments from same emails
      const leadEmails = [...new Set((data || []).map((l: any) => l.patient_email?.toLowerCase()).filter(Boolean))];
      let convertedCount = 0;
      if (leadEmails.length > 0) {
        const { count } = await supabaseClient
          .from("assessments")
          .select("patient_email", { count: "exact", head: true })
          .eq("type", "premium")
          .in("patient_email", leadEmails);
        convertedCount = count || 0;
      }

      const totalLeads = leadEmails.length;
      const completedLeads = (data || []).filter((l: any) => l.status === "completed").length;

      return new Response(JSON.stringify({
        leads: data,
        metrics: {
          total_leads: totalLeads,
          completed: completedLeads,
          converted_premium: convertedCount,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Archive a support ticket (soft delete + backup copy)
    if (action === "archive_ticket") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "Ticket ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the ticket
      const { data: ticket, error: fetchErr } = await supabaseClient
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr || !ticket) {
        return new Response(JSON.stringify({ error: "Ticket not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert backup copy
      const { error: archiveErr } = await supabaseClient
        .from("support_tickets_archive")
        .insert({
          original_ticket_id: ticket.id,
          user_id: ticket.user_id,
          subject: ticket.subject,
          message: ticket.message,
          status: ticket.status,
          admin_reply: ticket.admin_reply,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          archived_by: user.id,
        });

      if (archiveErr) throw archiveErr;

      // Soft delete: set archived_at
      const { error: updateErr } = await supabaseClient
        .from("support_tickets")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete a lead (assessment)
    if (action === "delete_lead") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseClient
        .from("assessments")
        .delete()
        .eq("id", id);

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
    log("ERROR", { message: error.message, stack: error.stack });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
