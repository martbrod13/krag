-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "visitorId" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "plan" TEXT,
    "actualStart" TEXT,
    "actualEnd" TEXT,
    "activities" TEXT[],
    "report" TEXT,
    "reportedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_circleId_date_idx" ON "Visit"("circleId", "date");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CareCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
