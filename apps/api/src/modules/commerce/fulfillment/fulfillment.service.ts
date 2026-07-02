import type { DriverAssignment, Fulfillment, FulfillmentDetailStatus } from "@prisma/client";
import { DriverAssignmentStatus, Role } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { emitOrderEvent, writeOrderEvent } from "../events/record-order-event";
import { sendDriverAssignmentOfferNotification, sendDriverReassignedAwayNotification } from "../notifications/notifications.service";
import {
  DriverAlreadyBusyError,
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

/** How long an OFFERED assignment waits for a driver response before expireStaleOffers reclaims it (Sprint 07.6 C-11). */
const OFFER_TIMEOUT_MS = Number(process.env.DRIVER_OFFER_TIMEOUT_MS ?? 3 * 60_000);

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

/**
 * Count of a specific driver's currently-busy (OFFERED/ACCEPTED/EN_ROUTE)
 * assignments, optionally excluding one fulfillment's own assignment row —
 * so reassigning a fulfillment to the driver it's already on isn't blocked
 * by its own existing row (Sprint 07.6 C-9).
 */
export async function countActiveAssignmentsForDriver(driverId: string, excludeFulfillmentId?: string): Promise<number> {
  return prisma.driverAssignment.count({
    where: {
      driverId,
      status: { in: BUSY_DRIVER_ASSIGNMENT_STATUSES },
      ...(excludeFulfillmentId ? { fulfillmentId: { not: excludeFulfillmentId } } : {}),
    },
  });
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

  const busyCount = await countActiveAssignmentsForDriver(driverId, fulfillment.id);
  if (busyCount > 0) {
    throw new DriverAlreadyBusyError();
  }

  // Captured before the upsert overwrites it — if this fulfillment already
  // had a *different*, still-active driver assigned, that driver needs to
  // be told the job is no longer theirs (Sprint 07.7 H-8), since the
  // upsert below silently replaces their row otherwise.
  const existingAssignment = await prisma.driverAssignment.findUnique({ where: { fulfillmentId: fulfillment.id } });
  const previousDriverId =
    existingAssignment &&
    existingAssignment.driverId !== driverId &&
    BUSY_DRIVER_ASSIGNMENT_STATUSES.includes(existingAssignment.status)
      ? existingAssignment.driverId
      : undefined;

  const offerExpiresAt = new Date(Date.now() + OFFER_TIMEOUT_MS);
  const assignment = await prisma.driverAssignment.upsert({
    where: { fulfillmentId: fulfillment.id },
    create: {
      fulfillmentId: fulfillment.id,
      driverId,
      status: DriverAssignmentStatus.OFFERED,
      offerExpiresAt,
    },
    update: {
      driverId,
      status: DriverAssignmentStatus.OFFERED,
      acceptedAt: null,
      offerExpiresAt,
    },
  });

  // Best-effort — a notification failure must never prevent the
  // assignment itself from being considered successfully created
  // (Sprint 07.6 C-10, mirroring the C-2/C-15 post-success pattern).
  if (driver.phone) {
    try {
      const orderNumber = await orderNumberForFulfillment(fulfillment.id);
      await sendDriverAssignmentOfferNotification(fulfillment.orderId, restaurantId, driver.phone, orderNumber);
    } catch (err) {
      console.error("assignDriver: driver offer notification failed", err);
    }
  }

  if (previousDriverId) {
    try {
      const previousDriver = await prisma.user.findUnique({ where: { id: previousDriverId } });
      if (previousDriver?.phone) {
        const orderNumber = await orderNumberForFulfillment(fulfillment.id);
        await sendDriverReassignedAwayNotification(fulfillment.orderId, restaurantId, previousDriver.phone, orderNumber);
      }
    } catch (err) {
      console.error("assignDriver: driver reassignment notification failed", err);
    }
  }

  return assignment;
}

async function orderNumberForFulfillment(fulfillmentId: string): Promise<number> {
  const fulfillment = await prisma.fulfillment.findUniqueOrThrow({
    where: { id: fulfillmentId },
    include: { order: true },
  });
  return fulfillment.order.orderNumber;
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

/**
 * Transitions every OFFERED assignment whose offer has timed out to
 * EXPIRED, and alerts staff via an OrderEvent that the fulfillment needs
 * manual reassignment (Sprint 07.6 C-11). Intended to run on an interval —
 * see stale-offer-scheduler.ts. Never throws for an individual row failure;
 * one bad row does not stop the sweep from processing the rest.
 */
export async function expireStaleOffers(): Promise<{ expiredCount: number }> {
  const stale = await prisma.driverAssignment.findMany({
    where: { status: DriverAssignmentStatus.OFFERED, offerExpiresAt: { lt: new Date() } },
    include: { fulfillment: true },
  });

  let expiredCount = 0;
  for (const assignment of stale) {
    try {
      await prisma.driverAssignment.update({
        where: { id: assignment.id },
        data: { status: DriverAssignmentStatus.EXPIRED },
      });
      await writeOrderEvent({
        orderId: assignment.fulfillment.orderId,
        restaurantId: assignment.fulfillment.restaurantId,
        type: "DRIVER_OFFER_EXPIRED",
        payload: { fulfillmentId: assignment.fulfillmentId, driverId: assignment.driverId },
      });
      emitOrderEvent({
        orderId: assignment.fulfillment.orderId,
        restaurantId: assignment.fulfillment.restaurantId,
        type: "DRIVER_OFFER_EXPIRED",
        payload: { fulfillmentId: assignment.fulfillmentId, driverId: assignment.driverId },
      });
      expiredCount += 1;
    } catch (err) {
      console.error("expireStaleOffers: failed to expire assignment", assignment.id, err);
    }
  }

  return { expiredCount };
}
