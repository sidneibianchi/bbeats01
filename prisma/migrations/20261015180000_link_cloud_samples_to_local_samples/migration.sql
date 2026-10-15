ALTER TABLE "Sample" ADD COLUMN "localSampleId" TEXT;

CREATE UNIQUE INDEX "Sample_localSampleId_key" ON "Sample"("localSampleId");
