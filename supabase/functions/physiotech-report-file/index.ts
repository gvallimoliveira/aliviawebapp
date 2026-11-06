import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/caller-auth.ts";
import { persistReportPdf, reportSource } from "../_shared/physiotechFiles.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const auth = await requireUser(req, cors);
  if (auth instanceof Response) return auth;
  try {
    const { reportId, pdfUrl, action } = await req.json();
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
    const { data: report } = await caller.from("physiotech_reports").select("*").eq("id", reportId).maybeSingle();
    if (!report) return json({ error: "not_found" }, 404);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (action === "delete") {
      if (report.file_id) {
        const { data: file } = await caller.from("patient_files").select("id,file_path").eq("id", report.file_id).maybeSingle();
        if (!file) return json({ error: "forbidden" }, 403);
        const { data: removed, error } = await caller.from("patient_files").delete().eq("id", file.id).select("id");
        if (error || !removed?.length) return json({ error: "forbidden" }, 403);
        const { error: storageError } = await admin.storage.from("patient-files").remove([file.file_path]);
        if (storageError) return json({ error: "storage_cleanup_failed" }, 500);
      } else {
        const { data, error } = await caller.from("physiotech_reports").delete().eq("id", report.id).select("id");
        if (error || !data?.length) return json({ error: "forbidden" }, 403);
      }
      return json({ ok: true });
    }
    let fileId = report.file_id;
    if (!fileId) {
      if (!report.pdf_url) return json({ error: "pdf_unavailable" }, 422);
      const source = pdfUrl || report.pdf_url;
      if (reportSource(source) !== reportSource(report.pdf_url)) return json({ error: "source_mismatch" }, 403);
      const { data: patient } = await admin.from("patients").select("*").eq("id", report.patient_id).single();
      if (!patient) return json({ error: "not_found" }, 404);
      const attachment = await persistReportPdf(admin, patient, report.sent_by, source, report.exam_type, report.exam_date, report.exam_title);
      const { data: updated, error } = await admin.from("physiotech_reports").update({ file_id: attachment.fileId, pdf_url: null }).eq("id", report.id).is("file_id", null).select("id");
      if (error || !updated?.length) {
        await admin.from("patient_files").delete().eq("id", attachment.fileId);
        await admin.storage.from("patient-files").remove([attachment.path]);
        return json({ error: "retry" }, 409);
      }
      fileId = attachment.fileId;
    }
    const { data: file } = await caller.from("patient_files").select("file_path").eq("id", fileId).single();
    if (!file) return json({ error: "forbidden" }, 403);
    const { data, error } = await caller.storage.from("patient-files").createSignedUrl(file.file_path, 300);
    if (error || !data?.signedUrl) return json({ error: "pdf_unavailable" }, 422);
    return json({ ok: true, url: data.signedUrl });
  } catch (e) { return json({ error: e instanceof Error ? e.message : "internal" }, 422); }
});