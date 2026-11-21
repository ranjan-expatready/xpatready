Entry points: `seedSampleFirmsAsDemo` (load and reset) adds the Sample consultation type inside the Sample seed's own transaction (`seedSampleFirms`' `then` with front-office/booking-seed.ts `addSampleConsultationTypeSafely`: a savepoint, a failure logged, one bypass line per firm) (DEMO-LINK)
Tests: tests/check_aud1a_insert_only.ts
