import { resolveCname } from "node:dns/promises";
import type { Domain } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { DomainAlreadyClaimedError, DomainNotFoundError } from "./site.errors";
import { getOwnSiteById } from "./site.service";

const PLATFORM_DOMAIN = process.env.SITE_PLATFORM_DOMAIN ?? "sites.ordervora.example";
const EXPECTED_CNAME_TARGET = `edge.${PLATFORM_DOMAIN}`;

/**
 * Real DNS verification (§20): checks the hostname's CNAME actually points
 * at our edge target before we'd ever route traffic for it — this part
 * genuinely runs and is unit-testable via mocking node:dns/promises.
 * TLS issuance via ACME/Let's Encrypt is NOT implemented (no live ACME
 * account or edge server in this sandbox) — tlsStatus stays PENDING after
 * verification; see Known Limitations. Swapping in a real ACME client
 * later only touches the caller that reads tlsStatus, not this function.
 */
export async function checkDnsOwnership(hostname: string): Promise<boolean> {
  try {
    const records = await resolveCname(hostname);
    return records.some((record) => record.toLowerCase() === EXPECTED_CNAME_TARGET.toLowerCase());
  } catch {
    return false;
  }
}

export async function addDomain(restaurantId: string, siteId: string, hostname: string): Promise<Domain> {
  const site = await getOwnSiteById(restaurantId, siteId);
  const existing = await prisma.domain.findUnique({ where: { hostname } });
  if (existing) {
    throw new DomainAlreadyClaimedError();
  }
  return prisma.domain.create({
    data: { siteId: site.id, hostname, type: "CUSTOM", verificationStatus: "PENDING", tlsStatus: "PENDING" },
  });
}

export async function listDomains(restaurantId: string, siteId: string): Promise<Domain[]> {
  const site = await getOwnSiteById(restaurantId, siteId);
  return prisma.domain.findMany({ where: { siteId: site.id }, orderBy: { createdAt: "asc" } });
}

async function findOwnDomain(siteId: string, domainId: string): Promise<Domain> {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain || domain.siteId !== siteId) {
    throw new DomainNotFoundError();
  }
  return domain;
}

export async function verifyDomain(restaurantId: string, siteId: string, domainId: string): Promise<Domain> {
  const site = await getOwnSiteById(restaurantId, siteId);
  const domain = await findOwnDomain(site.id, domainId);
  const verified = await checkDnsOwnership(domain.hostname);
  return prisma.domain.update({ where: { id: domain.id }, data: { verificationStatus: verified ? "VERIFIED" : "FAILED" } });
}

export async function setPrimaryDomain(restaurantId: string, siteId: string, domainId: string): Promise<Domain> {
  const site = await getOwnSiteById(restaurantId, siteId);
  const domain = await findOwnDomain(site.id, domainId);
  if (domain.verificationStatus !== "VERIFIED") {
    throw new DomainNotFoundError();
  }

  return prisma.$transaction(async (tx) => {
    await tx.domain.updateMany({ where: { siteId: site.id }, data: { isPrimary: false } });
    return tx.domain.update({ where: { id: domain.id }, data: { isPrimary: true } });
  });
}

export async function removeDomain(restaurantId: string, siteId: string, domainId: string): Promise<void> {
  const site = await getOwnSiteById(restaurantId, siteId);
  const domain = await findOwnDomain(site.id, domainId);
  await prisma.domain.delete({ where: { id: domain.id } });
}
