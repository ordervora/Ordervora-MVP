-- CreateEnum
CREATE TYPE "ContentGenerationScope" AS ENUM ('FULL', 'HERO', 'ABOUT', 'WHY_CHOOSE_US', 'FEATURED', 'CONTACT', 'FOOTER', 'SEO', 'CTA', 'FAQ');

-- CreateEnum
CREATE TYPE "ContentGenerationStatus" AS ENUM ('COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ContentGeneration" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "scope" "ContentGenerationScope" NOT NULL,
    "pageSlug" TEXT,
    "content" JSONB NOT NULL,
    "status" "ContentGenerationStatus" NOT NULL,
    "provider" TEXT,
    "error" TEXT,
    "restoredFromId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentGeneration_siteId_versionNo_idx" ON "ContentGeneration"("siteId", "versionNo");

-- CreateIndex
CREATE INDEX "ContentGeneration_siteId_scope_idx" ON "ContentGeneration"("siteId", "scope");

-- AddForeignKey
ALTER TABLE "ContentGeneration" ADD CONSTRAINT "ContentGeneration_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGeneration" ADD CONSTRAINT "ContentGeneration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
