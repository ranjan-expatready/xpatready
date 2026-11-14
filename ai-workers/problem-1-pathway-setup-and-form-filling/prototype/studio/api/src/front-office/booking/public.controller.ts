// FO-3 (contracts §0.6 public doors, §2.2; AG-4-16..-21, -36..-38): the booking page's API. Open to anyone, so every
// route here is marked open on the read guard (OpenRead, P-348 (4)) and carries the door's own protections in the
// service: per-IP and per-firm limits, a honeypot and the minimum fill time on the booking form, one identical not-found
// for an unknown firm, slug, inactive type or bad link; it answers with no firm data beyond the page's own.
// Staff routes (create, reschedule, cancel, attendance, list) are services until PF-4's guard is on main.
import { Body, Controller, Get, Inject, Injectable, Param, Post, Query, Req, type OnModuleInit } from "@nestjs/common";
import { Db, OpenRead } from "../../core.ts";
import { BookingService, type BookingPorts } from "./service.ts";

export const BOOKING_PORTS = "FO3_BOOKING_PORTS";
type Req = { ip?: string; socket?: { remoteAddress?: string } };
const ipOf = (req: Req) => String(req.ip ?? req.socket?.remoteAddress ?? "unknown").slice(0, 64);

@Injectable()
export class Booking extends BookingService implements OnModuleInit {
  constructor(@Inject(Db) db: Db, @Inject(BOOKING_PORTS) ports: BookingPorts) { super(db, ports); }
  async onModuleInit() { await this.registerJobs(); }
}

@Controller("api/public")
export class BookingPublicController {
  constructor(@Inject(Booking) private readonly b: Booking) {}

  @OpenRead("the public booking page: free times of a firm's public consultation type (contracts §0.6)")
  @Get("firms/:firmKey/book/:slug/slots")
  slots(@Param("firmKey") firmKey: string, @Param("slug") slug: string, @Query() q: Record<string, unknown>, @Req() req: Req) { return this.b.publicSlots(firmKey, slug, q, ipOf(req)); }

  @Post("firms/:firmKey/book/:slug/bookings")
  book(@Param("firmKey") firmKey: string, @Param("slug") slug: string, @Body() body: unknown, @Req() req: Req) { return this.b.publicBook(firmKey, slug, body, ipOf(req)); }

  @OpenRead("the booker's own self-service link (its token is the key; one identical not-found otherwise)")
  @Get("bookings/:token")
  manage(@Param("token") token: string, @Req() req: Req) { return this.b.manageView(token, ipOf(req)); }

  @OpenRead("the booker's own self-service link: the times it may move to")
  @Get("bookings/:token/slots")
  manageSlots(@Param("token") token: string, @Query() q: Record<string, unknown>, @Req() req: Req) { return this.b.manageSlots(token, q, ipOf(req)); }

  @Post("bookings/:token/reschedule")
  reschedule(@Param("token") token: string, @Body() body: unknown, @Req() req: Req) { return this.b.selfReschedule(token, body, ipOf(req)); }

  @Post("bookings/:token/cancel")
  cancel(@Param("token") token: string, @Req() req: Req) { return this.b.selfCancel(token, ipOf(req)); }
}
