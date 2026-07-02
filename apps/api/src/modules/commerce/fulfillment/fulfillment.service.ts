import type { DriverAssignment, Fulfillment, FulfillmentDetailStatus } from "@prisma/client";
import { DriverAssignmentStatus, Role } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import {
  DriverAssignmentNotFoundError,
  DriverNotOnStaffError,
  FulfillmentNotFoundError,
} from "./fulfillment.errors";

/** Non-terminal Fulfillment statuses — used to scope "currently active" driver-assignment counts. */
const TERMINAL_FULFILLMENT_STATUSES: FulfillmentDetailStatus[] = [
  "DELIVERED",
  "PICKED_UP_BY_CUSTOMER",
  "FAILED",
  "CANCELLED",
];

/** Statuses that mean "this driver currently has the job" for busy-driver concurrency checks (§7 Smart Routing). */
const BUSY_DRIVER_ASSIGNMENT_STATUSES: DriverAssignmentStatus[] = [
  DriverAssignmentStatus.OFFERED,
  DriverAssignmentStatus.ACCEPTED,
  DriverAssignmentStatus.EN_ROUTE,
];

export async function getFulfillment(restaurantId: string, fulfillmentId: string): Promise<Fulfillment> {
  const fulfillment = await prisma.fulfillment.findUnique({ where: { id: fulfillmentId } });
  if (!fulfillment || fulfillment.restaurantId !== restaurantId) {
    throw new FulfillmentNotFoundError();
  }
  return fulfillment;
}

export async function updateFulfillmentStatus(
  restaurantId: string,
  fulfillmentId: string,
  status: FulfillmentDetailStatus,
): Promise<Fulfillment> {
  const fulfillment = await getFulfillment(restaurantId, fulfillmentId);
  return prisma.fulfillment.update({ where: { id: fulfillment.id }, data: { status } });
}

export async function assignDriver(
  restaurantId: string,
  fulfillmentId: string,
  driverId: string,
): Promise<DriverAssignment> {
  const fulfillment = await getFulfillment(restaurantId, fulfillmentId);

  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  if (!driver || driver.restaurantId !== restaurantId || driver.role !== Role.RESTAURANT_STAFF) {
    throw new DriverNotOnStaffError();
  }

  return prisma.driverAssignment.upsert({
    where: { fulfillmentId: fulfillment.id },
    create: {
      fulfillmentId: fulfillment.id,
      driverId,
      status: DriverAssignmentStatus.OFFERED,
    },
    update: {
      driverId,
      status: DriverAssignmentStatus.OFFERED,
      acceptedAt: null,
    },
  });
}

async function findOwnDriverAssignment(driverId: string, driverAssignmentId: string): Promise<DriverAssignment> {
  const assignment = await prisma.driverAssignment.findUnique({ where: { id: driverAssignmentId } });
  if (!assignment || assignment.driverId !== driverId) {
    throw new DriverAssignmentNotFoundError();
  }
  return assignment;
}

export async function respondToAssignment(
  driverId: string,
  driverAssignmentId: string,
  accept: boolean,
): Promise<DriverAssignment> {
  const assignment = await findOwnDriverAssignment(driverId, driverAssignmentId);
  return prisma.driverAssignment.update({
    where: { id: assignment.id },
    data: accept
      ? { status: DriverAssignmentStatus.ACCEPTED, acceptedAt: new Date() }
      : { status: DriverAssignmentStatus.DECLINED },
  });
}

export async function getDriverAssignmentByFulfillment(fulfillmentId: string): Promise<DriverAssignment | null> {
  return prisma.driverAssignment.findUnique({ where: { fulfillmentId } });
}

/** The driver app's own queue — this restaurant's non-terminal assignments for the calling staff member. */
export async function listMyDriverAssignments(restaurantId: string, driverId: string) {
  return prisma.driverAssignment.findMany({
    where: {
      driverId,
      status: { in: BUSY_DRIVER_ASSIGNMENT_STATUSES },
      fulfillment: { restaurantId, status: { notIn: TERMINAL_FULFILLMENT_STATUSES } },
    },
    include: { fulfillment: { include: { order: true } } },
    orderBy: { assignedAt: "asc" },
  });
}

/**
 * Writes an append-only history row (DriverLocationPing) and the
 * denormalized "current position" fields on DriverAssignment in the same
 * call — both must stay in sync (§2 schema note).
 */
export async function recordLocationPing(
  driverAssignmentId: string,
  lat: number,
  lng: number,
): Promise<DriverAssignment> {
  const assignment = await prisma.driverAssignment.findUnique({ where: { id: driverAssignmentId } });
  if (!assignment) {
    throw new DriverAssignmentNotFoundError();
  }

  const recordedAt = new Date();
  const [, updated] = await prisma.$transaction([
    prisma.driverLocationPing.create({ data: { driverAssignmentId, lat, lng, recordedAt } }),
    prisma.driverAssignment.update({
      where: { id: driverAssignmentId },
      data: { currentLat: lat, currentLng: lng, lastLocationAt: recordedAt },
    }),
  ]);
  return updated;
}

/**
 * Count of DriverAssignments currently "busy" (OFFERED/ACCEPTED/EN_ROUTE)
 * for this restaurant's active (non-terminal) Fulfillments. Exposed for
 * the Smart Routing Engine's busy-driver concurrency check (§7) — a
 * different module built separately.
 */
export async function countActiveDriverAssignments(restaurantId: string): Promise<number> {
  return prisma.driverAssignment.count({
    where: {
      status: { in: BUSY_DRIVER_ASSIGNMENT_STATUSES },
      fulfillment: {
        restaurantId,
        status: { notIn: TERMINAL_FULFILLMENT_STATUSES },
      },
    },
  });
}
