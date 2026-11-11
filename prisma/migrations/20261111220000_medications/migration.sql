-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "weekdays" INTEGER[],
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "showToSenior" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationTime" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "amount" TEXT,

    CONSTRAINT "MedicationTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationIntake" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedById" TEXT,
    "bySenior" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MedicationIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medication_circleId_idx" ON "Medication"("circleId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationTime_medicationId_time_key" ON "MedicationTime"("medicationId", "time");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationIntake_medicationId_date_time_key" ON "MedicationIntake"("medicationId", "date", "time");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CareCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationTime" ADD CONSTRAINT "MedicationTime_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationIntake" ADD CONSTRAINT "MedicationIntake_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationIntake" ADD CONSTRAINT "MedicationIntake_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
