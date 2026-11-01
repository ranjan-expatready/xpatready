-- C11.10 (P-115): a person's own view choices (Cards / List on Immigration programs), kept on the server.
CREATE TABLE "person_preference" (
    "actor" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_preference_pkey" PRIMARY KEY ("actor","key")
);
