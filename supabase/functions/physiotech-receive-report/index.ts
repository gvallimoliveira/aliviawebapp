// Receives a finished PhysioTech report (push, on demand) and files it in the
// Aliv.iA record: PDF in patient_files + structured row in physiotech_reports.
// Auth: `reportToken` issued by physiotech-sso (HMAC, bound to sender + patient).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canSendReport, getPhysioTechEntitlement } from "../_shared/physiotechEntitlement.ts";
import { persistReportPdf } from "../_shared/physiotechFiles.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const b64u = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));
const TYPES = ["termografia", "ultrassom", "ressonancia"];
const isHttps = (u: unknown) => typeof u === "string" && /^https:\/\//i.test(u) && u.length < 2000;

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(Deno.env.get("PHYSIOTECH_SSO_SECRET")!),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return b64u(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const b = await req.json().catch(() => null);
    if (!b) return json({ error: "bad json" }, 400);

    const [p, sig] = String(b.reportToken || "").split(".");
    if (!p || !sig || (await hmac(p)) !== sig) return json({ error: "invalid token" }, 401);
    const tok = JSON.parse(fromB64u(p));
    if (tok.t !== "report" || Date.now() > tok.exp) return json({ error: "expired token" }, 401);
    if (b.aliviaPatientId && b.aliviaPatientId !== tok.pid) return json({ error: "patient mismatch" }, 403);

    const examType = String(b.examType || "").toLowerCase();
    if (!TYPES.includes(examType)) return json({ error: "examType" }, 400);
    const conclusion = typeof b.conclusion === "string" ? b.conclusion.slice(0, 8000) : null;
    const examTitle = typeof b.examTitle === "string" ? b.examTitle.slice(0, 200) : null;
    const examDate = b.examDate && !isNaN(Date.parse(b.examDate)) ? new Date(b.examDate).toISOString() : new Date().toISOString();
    const metrics = b.metrics && typeof b.metrics === "object" ? b.metrics : {};
    if (JSON.stringify(metrics).length > 50000) return json({ error: "metrics too large" }, 400);
    const images = Array.isArray(b.images) ? b.images.filter(isHttps).slice(0, 12) : [];
    const pdfUrl = isHttps(b.pdfUrl) ? b.pdfUrl : null;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: patient } = await admin.from("patients")
      .select("id, full_name, email, clinic_id, professional_id").eq("id", tok.pid).maybeSingle();
    if (!patient) return json({ error: "patient not found" }, 404);
    const { data: allowed } = await admin.rpc("can_access_patient", { _patient_id: patient.id, _user_id: tok.sub });
    if (!allowed) return json({ error: "forbidden" }, 403);

    const { data: sender } = await admin.auth.admin.getUserById(tok.sub);
    const ent = await getPhysioTechEntitlement(admin, tok.sub, sender?.user?.email || "");
    if (!canSendReport(ent)) return json({ error: "quota_exhausted", entitlement: ent }, 402);

    // Copy the PDF into Aliv.iA storage (PhysioTech URLs may be temporary).
    if (!pdfUrl) return json({ error: "pdf_required" }, 400);
    let attachment;
    try { attachment = await persistReportPdf(admin, patient, tok.sub, pdfUrl, examType, examDate, examTitle); }
    catch (e) { return json({ error: e instanceof Error ? e.message : "pdf_copy_failed", pdfAttached: false }, 422); }

    const { data: rep, error } = await admin.from("physiotech_reports").insert({
      patient_id: patient.id, clinic_id: patient.clinic_id, professional_id: patient.professional_id,
      sent_by: tok.sub, exam_type: examType, exam_title: examTitle, exam_date: examDate,
      conclusion, metrics, images, pdf_url: null, file_id: attachment.fileId,
    }).select("id").single();
    if (error) {
      await admin.from("patient_files").delete().eq("id", attachment.fileId);
      await admin.storage.from("patient-files").remove([attachment.path]);
      throw error;
    }
    return json({ ok: true, reportId: rep.id, pdfAttached: true });
  } catch (e) {
    console.error("physiotech-receive-report", e);
    return json({ error: "internal" }, 500);
  }
});
