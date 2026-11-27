import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFeedbackClinicians = (clinicId: string) => useQuery({
  queryKey: ["feedback-clinicians", clinicId],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_feedback_clinicians", { _clinic_id: clinicId });
    if (error) throw error;
    return data ?? [];
  },
});