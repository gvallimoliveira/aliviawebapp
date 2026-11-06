ALTER TABLE public.patient_files ADD COLUMN patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE;
CREATE INDEX patient_files_patient_id_idx ON public.patient_files(patient_id) WHERE patient_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.remove_attached_physiotech_report() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN DELETE FROM public.physiotech_reports WHERE file_id = OLD.id; RETURN OLD; END $$;
REVOKE ALL ON FUNCTION public.remove_attached_physiotech_report() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER remove_attached_physiotech_report BEFORE DELETE ON public.patient_files FOR EACH ROW EXECUTE FUNCTION public.remove_attached_physiotech_report();