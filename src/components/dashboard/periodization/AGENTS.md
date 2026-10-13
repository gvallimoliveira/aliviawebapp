# Periodization UI rules
- Periodization buttons use type="button"; they sit inside patient-record forms.
- Microcycle planned sessions from today or the previous 7 days open a pre-filled monitored-session dialog on click (MicroWeekGrid → saveProfessionalSession); future sessions stay read-only and the trash action must stopPropagation.
- Cardio analysis mounts only inside `CardioAnalysisDialog`; keeps the record light.
- Every command inside PeriodizationSection anchors the touched element and stores a short-lived scroll mark restored after remounts; load-control actions must never move the page.
