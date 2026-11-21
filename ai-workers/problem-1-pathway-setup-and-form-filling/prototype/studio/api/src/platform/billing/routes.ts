// PF-5 part 2: the billing and profile routes, Stripe's webhook door and the payment hold.
//   * Payment hold (contracts §7, SA-2-6, SA-4-25, -27): a held firm's signed-in staff reach billing, the data download
//     (PF-11's, marked @HoldOpen when it exists), their own identity and the session routes only; every other route that
//     knows the staff member's firm answers 402. Decided by the route's own declaration (never by the URL's letters), after
//     the platform guard (an interceptor runs after every guard).
//   * POST /api/hooks/stripe reads the raw body (stripeRawBody, mounted before the app's JSON parser in main.ts).
import { Body, Controller, Get, Headers, HttpCode, HttpException, Inject, Injectable, Optional, Post, Put, Req, SetMetadata, type CallHandler, type ExecutionContext, type NestInterceptor, type OnModuleInit } from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/constants.js";
import { Reflector } from "@nestjs/core";
import express from "express";
import { Db } from "../../core.ts";
import { PermissionKeys, staffOf, type StaffContext } from "../identity/keys.ts";
import { PlatformJobs } from "../jobs/platform-jobs.ts";
import { BillingAccount } from "./account.ts";
import { BillingEvents, type BillingPorts } from "./webhook.ts";

export const BILLING_PORTS = "PF5_BILLING_PORTS";
const HOLD_OPEN = "platform:hold-open";
/** A route a held firm still reaches (billing, the data download). */
export const HoldOpen = () => SetMetadata(HOLD_OPEN, true);
/** PF-4's routes a held person needs to sign in, see who they are and sign out (route templates, exact). */
const IDENTITY_OPEN = new Set(["api/platform/me", "api/platform/me/terms", "api/platform/me/terms/accept", "api/platform/session/local", "api/platform/session/callback", "api/platform/session/sign-out"]);   // PF-5t's terms: a held person accepts pending terms, then pays (review r10)
export const HOLD_WORDS = "Your firm's subscription is on hold. Only billing and your data download are open: add a card or pay the open invoice to continue.";

/** Stripe signs the exact bytes it sent: its door gets the raw body (1 MB), before the app's JSON parser. */
export function stripeRawBody(app: { use: (...a: unknown[]) => unknown }) { app.use("/api/hooks/stripe", express.raw({ type: "*/*", limit: "1mb" })); }

const template = (ctx: ExecutionContext) => [Reflect.getMetadata(PATH_METADATA, ctx.getClass()), Reflect.getMetadata(PATH_METADATA, ctx.getHandler())].flat().filter((p) => typeof p === "string" && p !== "/").map((p: string) => p.replace(/^\/+|\/+$/g, "")).join("/");

@Injectable()
export class PaymentHoldGate implements NestInterceptor {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Reflector) private readonly reflector: Reflector) {}
  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const staff = ctx.getType() === "http" ? ctx.switchToHttp().getRequest<{ platform?: StaffContext }>().platform : undefined;
    if (staff && !this.reflector.getAllAndOverride<boolean>(HOLD_OPEN, [ctx.getHandler(), ctx.getClass()]) && !IDENTITY_OPEN.has(template(ctx))) {
      const firm = await this.db.platformFirm.findUnique({ where: { id: staff.firmId }, select: { status: true } });
      if (firm?.status === "PAYMENT_HOLD") throw new HttpException({ type: "https://expatready.local/problems/payment-hold", title: "Payment needed", status: 402, detail: HOLD_WORDS, code: "PAYMENT_HOLD" }, 402);
    }
    return next.handle();
  }
}

@Injectable()
export class PlatformBillingEvents extends BillingEvents implements OnModuleInit {
  constructor(@Inject(Db) db: Db, @Inject(BILLING_PORTS) ports: BillingPorts, @Optional() @Inject(PlatformJobs) jobs?: PlatformJobs | null) { super(db, { ...ports, jobs: ports.jobs ?? jobs ?? null }); }
  async onModuleInit() { await this.registerJobs(); }
}
@Injectable()
export class PlatformBillingAccount extends BillingAccount {
  constructor(@Inject(Db) db: Db, @Inject(BILLING_PORTS) ports: BillingPorts) { super(db, ports); }
}

type R = { platform?: StaffContext; body?: unknown };

@Controller("api/hooks")
export class StripeHookController {
  constructor(@Inject(PlatformBillingEvents) private readonly e: PlatformBillingEvents) {}
  @Post("stripe") @HttpCode(200)
  stripe(@Req() r: R, @Headers("stripe-signature") signature?: string) { return this.e.receive(r.body, signature); }
}

/** Keys (PF-3's catalogue): Owner and Admin hold subscription:pay and :update-card; invoices add Billing / Finance; the
 *  portal (which can cancel) is subscription:cancel, Owner only. */
@Controller("api/platform")
export class BillingController {
  constructor(@Inject(PlatformBillingAccount) private readonly a: PlatformBillingAccount) {}

  @Get("billing") @HoldOpen() @PermissionKeys("agent/subscription:pay")
  view(@Req() r: R) { return this.a.view(staffOf(r)); }

  @Get("billing/invoices") @HoldOpen() @PermissionKeys("agent/subscription-invoice:view")
  invoices(@Req() r: R) { return this.a.invoices(staffOf(r)); }

  @Put("billing/address") @HoldOpen() @PermissionKeys("agent/subscription:pay")
  address(@Req() r: R, @Body() b: unknown) { return this.a.setAddress(staffOf(r), b); }

  @Post("billing/checkout") @HttpCode(200) @HoldOpen() @PermissionKeys("agent/subscription:update-card")
  checkout(@Req() r: R) { return this.a.card(staffOf(r)); }

  @Post("billing/portal") @HttpCode(200) @HoldOpen() @PermissionKeys("agent/subscription:cancel")
  portal(@Req() r: R) { return this.a.portal(staffOf(r)); }
}
