ALTER TABLE public.video_call_sessions
  ADD COLUMN IF NOT EXISTS offer_sdp text,
  ADD COLUMN IF NOT EXISTS answer_sdp text;

COMMENT ON COLUMN public.video_call_sessions.offer_sdp IS 'Temporary WebRTC offer used as durable signaling fallback for call participants.';
COMMENT ON COLUMN public.video_call_sessions.answer_sdp IS 'Temporary WebRTC answer used as durable signaling fallback for call participants.';