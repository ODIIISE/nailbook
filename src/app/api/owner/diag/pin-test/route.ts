import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import crypto from "crypto";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

// GET: Show all users and their PIN hashes for debugging
export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { rows: users } = await sql`SELECT id, phone, name, role, pin FROM users ORDER BY created_at`;

    // Test: hash "1234" and "9901" to show what they should look like
    const testHashes = {
      "1234": hashPin("1234"),
      "9901": hashPin("9901"),
    };

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        pinHash: u.pin,
        pinLength: u.pin?.length,
      })),
      testHashes,
      note: "Compare pinHash with testHashes to verify hashing is correct",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Test PIN update for a specific user
export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { userId, newPin } = await request.json();
    if (!userId || !newPin) {
      return NextResponse.json({ error: "userId and newPin required" }, { status: 400 });
    }

    const hashedPin = hashPin(String(newPin));

    // Step 1: Get current state
    const { rows: before } = await sql`SELECT pin FROM users WHERE id = ${userId}`;
    const oldPin = before[0]?.pin;

    // Step 2: Update
    const { rowCount } = await sql`UPDATE users SET pin = ${hashedPin} WHERE id = ${userId}`;

    // Step 3: Verify after update
    const { rows: after } = await sql`SELECT pin FROM users WHERE id = ${userId}`;
    const newPinHash = after[0]?.pin;

    // Step 4: Test verify flow (same as verify-pin endpoint)
    const verifyResult = hashPin(String(newPin));
    const matchesVerify = newPinHash === verifyResult;

    return NextResponse.json({
      userId,
      newPin,
      hashedPin,
      rowCount,
      before: { pin: oldPin, length: oldPin?.length },
      after: { pin: newPinHash, length: newPinHash?.length },
      matchesVerify,
      debug: {
        hashInput: String(newPin),
        hashOutput: hashedPin,
        storedValue: newPinHash,
        verifyValue: verifyResult,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
