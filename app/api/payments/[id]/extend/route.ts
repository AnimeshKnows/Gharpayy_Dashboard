import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import PaymentBooking from "@/models/PaymentBooking";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await connectToDatabase();

    const booking = await PaymentBooking.findById(id);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Only allow extension if offer is expired
    const now = new Date();
    const isExpired =
      booking.status === "expired" ||
      (booking.offerExpiresAt && new Date(booking.offerExpiresAt) < now);

    if (!isExpired) {
      return NextResponse.json(
        { error: "Offer has not expired yet" },
        { status: 400 }
      );
    }

    // One-time extension guard
    if (booking.extensionUsed) {
      return NextResponse.json(
        { error: "Extension already used for this booking" },
        { status: 403 }
      );
    }

    // Grant 10-minute extension
    const newExpiry = new Date(now.getTime() + 10 * 60 * 1000);

    booking.status = "approved";
    booking.offerExpiresAt = newExpiry;
    booking.extensionUsed = true;

    await booking.save();

    return NextResponse.json(booking, { status: 200 });
  } catch (error) {
    console.error("[EXTEND_ROUTE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}