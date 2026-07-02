import type { Request, Response } from "express";
import {
  CUSTOMER_REFRESH_TOKEN_COOKIE,
  clearCustomerAuthCookies,
  setCustomerAccessTokenCookie,
  setCustomerRefreshTokenCookie,
} from "./customer-cookies";
import { signCustomerAccessToken, signCustomerRefreshToken, verifyCustomerRefreshToken } from "./customer-jwt";
import { CustomerEmailInUseError, InvalidCustomerCredentialsError, InvalidCustomerRefreshTokenError } from "./customers.errors";
import { getCustomerById, registerCustomer, toPublicCustomer, validateCustomerCredentials } from "./customers.service";
import { loginCustomerSchema, registerCustomerSchema } from "./customers.validation";

function issueAndSetCookies(res: Response, customerId: string): void {
  setCustomerAccessTokenCookie(res, signCustomerAccessToken(customerId));
  setCustomerRefreshTokenCookie(res, signCustomerRefreshToken(customerId));
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const parsed = registerCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const customer = await registerCustomer(parsed.data);
    issueAndSetCookies(res, customer.id);
    res.status(201).json({ customer: toPublicCustomer(customer) });
  } catch (err) {
    if (err instanceof CustomerEmailInUseError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const parsed = loginCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const customer = await validateCustomerCredentials(parsed.data);
    issueAndSetCookies(res, customer.id);
    res.status(200).json({ customer: toPublicCustomer(customer) });
  } catch (err) {
    if (err instanceof InvalidCustomerCredentialsError) {
      res.status(401).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const presented = req.cookies?.[CUSTOMER_REFRESH_TOKEN_COOKIE];
  if (!presented) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const customerId = verifyCustomerRefreshToken(presented);
    issueAndSetCookies(res, customerId);
    res.status(200).json({ ok: true });
  } catch {
    clearCustomerAuthCookies(res);
    res.status(401).json({ error: new InvalidCustomerRefreshTokenError().message });
  }
}

export async function logoutHandler(_req: Request, res: Response): Promise<void> {
  clearCustomerAuthCookies(res);
  res.status(200).json({ ok: true });
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  const customer = await getCustomerById(req.customer!.id);
  if (!customer) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.status(200).json({ customer: toPublicCustomer(customer) });
}
