try {
  await sql`
    INSERT INTO bookings (
      customer_phone, service_id, date_gregorian, 
      start_time, end_time, status, created_at
    ) VALUES (
      ${phone}, ${serviceId}, ${date}, 
      ${startTime}, ${endTime}, 'confirmed', NOW()
    )
  `;
  
  return NextResponse.json({ success: true, message: "Booking confirmed" });

} catch (error: any) {
  // Check for Unique Violation Error (Postgres Code 23505)
  if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
    return NextResponse.json(
      { error: "این زمان همین الان رزرو شد. لطفاً زمان دیگری را انتخاب کنید." }, 
      { status: 409 } // Conflict
    );
  }
  
  // Log other errors
  console.error("Booking failed:", error);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
