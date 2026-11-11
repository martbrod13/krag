-- AlterTable
ALTER TABLE "PairedDevice" ADD COLUMN     "pairedById" TEXT;

-- CreateTable
CREATE TABLE "DevicePairing" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevicePairing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevicePairing_tokenHash_key" ON "DevicePairing"("tokenHash");

-- CreateIndex
CREATE INDEX "DevicePairing_circleId_idx" ON "DevicePairing"("circleId");

-- AddForeignKey
ALTER TABLE "DevicePairing" ADD CONSTRAINT "DevicePairing_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "CareCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePairing" ADD CONSTRAINT "DevicePairing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PairedDevice" ADD CONSTRAINT "PairedDevice_pairedById_fkey" FOREIGN KEY ("pairedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
