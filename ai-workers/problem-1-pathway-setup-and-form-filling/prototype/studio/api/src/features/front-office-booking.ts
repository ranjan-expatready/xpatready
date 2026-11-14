// FO-3: the booking API (public door; staff services wired to routes once PF-4 is on main).
import type { Feature } from "../features.ts";
import { Booking, BOOKING_PORTS, BookingPublicController } from "../front-office/booking/public.controller.ts";
import { runtimeBookingPorts } from "../front-office/booking/runtime-ports.ts";

export default { controllers: [BookingPublicController], providers: [Booking, { provide: BOOKING_PORTS, useFactory: runtimeBookingPorts }] } satisfies Feature;
