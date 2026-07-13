// Delete all bookings from the database
// Run: node scripts/delete-all-bookings.js

const { sql } = require("@vercel/postgres");

async function main() {
  try {
    const result = await sql`DELETE FROM bookings`;
    console.log(`Deleted ${result.rowCount} bookings`);
    
    const remaining = await sql`SELECT COUNT(*) as count FROM bookings`;
    console.log(`Remaining bookings: ${remaining.rows[0].count}`);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    process.exit(0);
  }
}

main();
