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

    // Get partner details with all access flags
    if (action === "get_partner_details") {
      const { data: partners, error } = await supabaseClient
        .from("professionals")
        .select("id, full_name, email, city, state, is_partner, premium_granted, user_id")
        .eq("is_partner", true)
        .order("full_name");

      if (error) throw error;

      // For each partner, check if they have an active clinic
      const enriched = await Promise.all((partners || []).map(async (p: any) => {
        const { data: clinic } = await supabaseClient
          .from("clinics")
          .select("id, name, subscription_status")
          .eq("owner_user_id", p.user_id)
          .maybeSingle();

        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          city: p.city,
          state: p.state,
          is_partner: p.is_partner,
          premium_granted: p.premium_granted,
          has_clinic: !!clinic,
          clinic_active: clinic?.subscription_status === "active" || clinic?.subscription_status === "trialing",
          clinic_id: clinic?.id || null,
          clinic_name: clinic?.name || null,
        };
      }));

      return new Response(JSON.stringify({ partners: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Toggle partner access (pro / clinic / premium)
    if (action === "toggle_partner_access") {
      const { professional_id, access_type, enabled, clinic_config } = body;
      if (!professional_id || !access_type) {
        return new Response(JSON.stringify({ error: "professional_id and access_type required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("toggle_partner_access", { professional_id, access_type, enabled });

      const { data: pro, error: proErr } = await supabaseClient
        .from("professionals")
        .select("id, user_id, full_name, is_partner")
        .eq("id", professional_id)
        .single();

      if (proErr || !pro) {
        return new Response(JSON.stringify({ error: "Professional not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (access_type === "pro") {
        const { error } = await supabaseClient
          .from("professionals")
          .update({
            is_partner: enabled,
            subscription_status: enabled ? "active" : "inactive",
            approved: enabled ? true : undefined,
          })
          .eq("id", professional_id);
        if (error) throw error;
      } else if (access_type === "clinic") {
        if (enabled) {
          // Check if partner already has a clinic
          const { data: existingClinic } = await supabaseClient
            .from("clinics")
            .select("id, subscription_status")
            .eq("owner_user_id", pro.user_id)
            .maybeSingle();

          if (existingClinic) {
            // Activate existing clinic
            const { error } = await supabaseClient
              .from("clinics")
              .update({ subscription_status: "active" })
              .eq("id", existingClinic.id);
            if (error) throw error;
          } else {
            // Create new clinic for partner with optional config
            const clinicInsert: any = {
              name: clinic_config?.name || `Clínica de ${pro.full_name}`,
              owner_user_id: pro.user_id,
              subscription_status: "active",
            };
            if (clinic_config?.phone) clinicInsert.phone = clinic_config.phone;
            if (clinic_config?.address) clinicInsert.address = clinic_config.address;
            if (clinic_config?.operating_hours_start) clinicInsert.operating_hours_start = clinic_config.operating_hours_start;
            if (clinic_config?.operating_hours_end) clinicInsert.operating_hours_end = clinic_config.operating_hours_end;
            if (clinic_config?.working_days) clinicInsert.working_days = clinic_config.working_days;
            if (clinic_config?.brand_color) clinicInsert.brand_color = clinic_config.brand_color;
            if (clinic_config?.max_members) clinicInsert.max_members = clinic_config.max_members;

            const { data: newClinic, error: clinicErr } = await supabaseClient
              .from("clinics")
              .insert(clinicInsert)
              .select("id")
              .single();

            if (clinicErr) throw clinicErr;

            // Add partner as owner member
            const { error: memberErr } = await supabaseClient
              .from("clinic_members")
              .insert({
                clinic_id: newClinic.id,
                user_id: pro.user_id,
                role: "owner",
                status: "active",
                accepted_at: new Date().toISOString(),
              });
            if (memberErr) throw memberErr;
          }
        } else {
          // Deactivate clinic
          const { data: clinic } = await supabaseClient
            .from("clinics")
            .select("id")
            .eq("owner_user_id", pro.user_id)
            .maybeSingle();

          if (clinic) {
            const { error } = await supabaseClient
              .from("clinics")
              .update({ subscription_status: "inactive" })
              .eq("id", clinic.id);
            if (error) throw error;
          }
        }
      } else if (access_type === "premium") {
        const { error } = await supabaseClient
          .from("professionals")
          .update({ premium_granted: enabled })
          .eq("id", professional_id);
        if (error) throw error;
      } else {
        return new Response(JSON.stringify({ error: "Invalid access_type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
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
          // 1. Create auth user with a cryptographically random temporary password
          const tempPassword = crypto.randomUUID() + crypto.randomUUID();
          const { data: newUserData, error: createError } = await supabaseClient.auth.admin.createUser({
            email: normalizedEmail,
            password: tempPassword,
            email_confirm: true,
          });

          if (createError) {
            // If user already exists in auth but not in professionals
            if (createError.message?.includes("already been registered")) {
              const existingUser = await findAuthUserByEmail(supabaseClient, normalizedEmail);
              log("Existing auth lookup", { found: !!existingUser, email: normalizedEmail });
              if (!existingUser) {
                return new Response(JSON.stringify({ error: createError.message }), {
                  status: 400,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }

              // Trigger password recovery email so partner sets their own password
              const { error: pwErr } = await supabaseClient.auth.admin.generateLink({
                type: "recovery",
                email: normalizedEmail,
              });
              log("Recovery link generated for existing user", { error: pwErr?.message });

              // Create professional profile for existing auth user
              const namePart = existingUser.user_metadata?.full_name || normalizedEmail.split("@")[0].replace(/[._-]/g, " ");
              const temporaryCrefito = await getAvailableTemporaryCrefito(supabaseClient, normalizedEmail);
              const { error: insertErr } = await supabaseClient
                .from("professionals")
                .insert({
                  user_id: existingUser.id,
                  email: normalizedEmail,
                  full_name: namePart,
                  crefito: temporaryCrefito,
                  city: "A definir",
                  state: "XX",
                  is_partner: true,
                  approved: true,
                  subscription_status: "active",
                });

              if (insertErr) throw insertErr;

              return new Response(JSON.stringify({ success: true, created: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            throw createError;
          }

          const newUserId = newUserData.user.id;
          const namePart = normalizedEmail.split("@")[0].replace(/[._-]/g, " ");
          const temporaryCrefito = await getAvailableTemporaryCrefito(supabaseClient, normalizedEmail);

          // 2. Create professional profile (profile is auto-created by handle_new_user trigger)
          const { error: insertErr } = await supabaseClient
            .from("professionals")
            .insert({
              user_id: newUserId,
              email: normalizedEmail,
              full_name: namePart,
              crefito: temporaryCrefito,
              city: "A definir",
              state: "XX",
              is_partner: true,
              approved: true,
              subscription_status: "active",
            });

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

      // If granting partner, send recovery email so they can (re)set their password securely
      if (is_partner) {
        const { data: proData } = await supabaseClient
          .from("professionals")
          .select("user_id, email")
          .eq("id", targetId)
          .single();
        if (proData?.user_id && proData?.email) {
          const { error: pwErr } = await supabaseClient.auth.admin.generateLink({
            type: "recovery",
            email: proData.email,
          });
          log("Recovery link sent on re-grant", { user_id: proData.user_id, error: pwErr?.message });
        }
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

    // Get clinic config by clinic_id
    if (action === "get_clinic_config") {
      const { clinic_id } = body;
      if (!clinic_id) {
        return new Response(JSON.stringify({ error: "clinic_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: clinic, error } = await supabaseClient
        .from("clinics")
        .select("id, name, phone, address, operating_hours_start, operating_hours_end, working_days, brand_color, max_members, logo_url")
        .eq("id", clinic_id)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ clinic }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update clinic config
    if (action === "update_clinic_config") {
      const { clinic_id, clinic_config } = body;
      if (!clinic_id || !clinic_config) {
        return new Response(JSON.stringify({ error: "clinic_id and clinic_config required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: any = {};
      if (clinic_config.name) updateData.name = clinic_config.name;
      if (clinic_config.phone !== undefined) updateData.phone = clinic_config.phone;
      if (clinic_config.address !== undefined) updateData.address = clinic_config.address;
      if (clinic_config.operating_hours_start) updateData.operating_hours_start = clinic_config.operating_hours_start;
      if (clinic_config.operating_hours_end) updateData.operating_hours_end = clinic_config.operating_hours_end;
      if (clinic_config.working_days) updateData.working_days = clinic_config.working_days;
      if (clinic_config.brand_color !== undefined) updateData.brand_color = clinic_config.brand_color;
      if (clinic_config.max_members) updateData.max_members = clinic_config.max_members;

      const { error } = await supabaseClient
        .from("clinics")
        .update(updateData)
        .eq("id", clinic_id);

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
