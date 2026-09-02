/**
 * Live curl-style verification script — uses Node's built-in http module.
 * Run with:  node scripts/curl-verify.mjs
 *
 * Covers every endpoint implemented through spec §9.1 and §9.2:
 *   POST /api/trips
 *   POST /api/trips/join
 *   POST /api/itinerary/generate
 *   GET  /api/itinerary/:tripId
 *
 * Also verifies every error case (§9.6 shape).
 */

import http from "http";

const BASE = "http://localhost:5000";
let passed = 0;
let failed = 0;

// ─── helpers ────────────────────────────────────────────────────────────────

function req(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { "Content-Type": "application/json" },
    };
    const r = http.request(opts, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on("error", reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function assert(label, condition, actual) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL — ${label}`);
    console.error(`     Got: ${JSON.stringify(actual)}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

// ─── tests ──────────────────────────────────────────────────────────────────

section("POST /api/trips — solo trip");
{
  const r = await req("POST", "/api/trips", {
    type: "trip", mode: "solo",
    destination: "Vaishno Devi", days: 3, people: 2,
    prompt: "vegetarian only",
  });
  console.log(`  → HTTP ${r.status}  body: ${JSON.stringify(r.body)}`);
  assert("status 201",               r.status === 201,              r.status);
  assert("has tripId (string)",      typeof r.body.tripId === "string", r.body);
  assert("no roomCode for solo",     !("roomCode" in r.body),       r.body);
}

section("POST /api/trips — group trip gets 6-char roomCode");
let groupTripId, roomCode;
{
  const r = await req("POST", "/api/trips", {
    type: "trip", mode: "group",
    destination: "Manali", days: 5, people: 8,
  });
  console.log(`  → HTTP ${r.status}  body: ${JSON.stringify(r.body)}`);
  assert("status 201",               r.status === 201,              r.status);
  assert("has tripId",               typeof r.body.tripId === "string", r.body);
  assert("has roomCode",             typeof r.body.roomCode === "string", r.body);
  assert("roomCode is 6 chars",      r.body.roomCode?.length === 6, r.body.roomCode);
  assert("roomCode is uppercase",    r.body.roomCode === r.body.roomCode?.toUpperCase(), r.body.roomCode);
  groupTripId = r.body.tripId;
  roomCode = r.body.roomCode;
}

section("POST /api/trips — validation errors");
{
  // missing all 3 required fields
  const r1 = await req("POST", "/api/trips", {});
  console.log(`  → HTTP ${r1.status}  body: ${JSON.stringify(r1.body)}`);
  assert("status 400",               r1.status === 400,             r1.status);
  assert("error.code MISSING_FIELDS",r1.body.error?.code === "MISSING_FIELDS", r1.body);
  assert("mentions destination",     /destination/i.test(r1.body.error?.message), r1.body.error?.message);
  assert("mentions days",            /days/i.test(r1.body.error?.message),        r1.body.error?.message);
  assert("mentions people",          /people/i.test(r1.body.error?.message),      r1.body.error?.message);

  // invalid days (float)
  const r2 = await req("POST", "/api/trips", { destination: "Goa", days: 2.5, people: 3 });
  console.log(`  → HTTP ${r2.status}  body: ${JSON.stringify(r2.body)}`);
  assert("float days → 400 INVALID_FIELD", r2.status === 400 && r2.body.error?.code === "INVALID_FIELD", r2.body);

  // invalid days (zero)
  const r3 = await req("POST", "/api/trips", { destination: "Goa", days: 0, people: 3 });
  assert("days=0 → 400 INVALID_FIELD", r3.status === 400 && r3.body.error?.code === "INVALID_FIELD", r3.body);

  // invalid mode
  const r4 = await req("POST", "/api/trips", { destination: "Goa", days: 3, people: 2, mode: "team" });
  assert("bad mode → 400 INVALID_FIELD", r4.status === 400 && r4.body.error?.code === "INVALID_FIELD", r4.body);
}

section("POST /api/trips/join — join the group trip");
let userId1, userId2;
{
  const r = await req("POST", "/api/trips/join", { roomCode, userName: "Priya" });
  console.log(`  → HTTP ${r.status}  body: ${JSON.stringify(r.body)}`);
  assert("status 200",               r.status === 200,              r.status);
  assert("tripId matches",           r.body.tripId === groupTripId, r.body);
  assert("has userId",               typeof r.body.userId === "string", r.body);
  userId1 = r.body.userId;

  // second member gets a different userId
  const r2 = await req("POST", "/api/trips/join", { roomCode, userName: "Raj" });
  userId2 = r2.body.userId;
  assert("second member gets different userId", userId1 !== userId2, { userId1, userId2 });

  // case-insensitive room code
  const r3 = await req("POST", "/api/trips/join", { roomCode: roomCode.toLowerCase(), userName: "Ali" });
  assert("lowercase roomCode works", r3.status === 200, r3.status);
}

section("POST /api/trips/join — error cases");
{
  // bad room code
  const r1 = await req("POST", "/api/trips/join", { roomCode: "ZZZZZZ", userName: "Ghost" });
  console.log(`  → HTTP ${r1.status}  body: ${JSON.stringify(r1.body)}`);
  assert("unknown roomCode → 404 ROOM_NOT_FOUND", r1.status === 404 && r1.body.error?.code === "ROOM_NOT_FOUND", r1.body);

  // missing roomCode
  const r2 = await req("POST", "/api/trips/join", { userName: "Ravi" });
  assert("missing roomCode → 400 MISSING_FIELDS", r2.status === 400 && r2.body.error?.code === "MISSING_FIELDS", r2.body);

  // missing userName
  const r3 = await req("POST", "/api/trips/join", { roomCode });
  assert("missing userName → 400 MISSING_FIELDS", r3.status === 400 && r3.body.error?.code === "MISSING_FIELDS", r3.body);
}

section("POST /api/itinerary/generate — create solo trip then generate");
let soloTripId, generatedBody;
{
  // create a fresh solo trip
  const created = await req("POST", "/api/trips", {
    destination: "Vaishno Devi", days: 2, people: 3, prompt: "vegetarian meals preferred",
  });
  soloTripId = created.body.tripId;
  console.log(`  Created trip: ${soloTripId}`);

  console.log("  Calling Gemini (retries up to 3x on 502/503)...");
  let r;
  for (let attempt = 1; attempt <= 3; attempt++) {
    r = await req("POST", "/api/itinerary/generate", { tripId: soloTripId });
    console.log(`  → Attempt ${attempt}: HTTP ${r.status}`);
    if (r.status === 200) break;
    if (attempt < 3) {
      console.log("  Retrying in 4s...");
      await new Promise(res => setTimeout(res, 4000));
    }
  }
  generatedBody = r.body;

  assert("status 200",               r.status === 200,              r.status);
  assert("body.tripId matches",      r.body.tripId === soloTripId,  r.body.tripId);
  assert("body.days is array",       Array.isArray(r.body.days),    r.body.days);
  assert("has 2 days",               r.body.days.length === 2,      r.body.days.length);

  for (const day of r.body.days) {
    assert(`day ${day.day}: has day number`,        typeof day.day === "number",    day);
    assert(`day ${day.day}: has items array`,       Array.isArray(day.items),       day);
    assert(`day ${day.day}: items non-empty`,       day.items.length > 0,           day.items.length);
    for (const item of day.items) {
      assert(`  item "${item.name}": has itemId`,   typeof item.itemId === "string", item.itemId);
      assert(`  item "${item.name}": has name`,     typeof item.name === "string",   item.name);
      assert(`  item "${item.name}": lat is number`,typeof item.lat === "number",    item.lat);
      assert(`  item "${item.name}": lng is number`,typeof item.lng === "number",    item.lng);
      assert(`  item "${item.name}": has type`,     typeof item.type === "string",   item.type);
      assert(`  item "${item.name}": completed=false`, item.completed === false,     item.completed);
    }
  }

  // itemIds must all be unique
  const allIds = r.body.days.flatMap(d => d.items.map(i => i.itemId));
  assert("all itemIds are unique",   new Set(allIds).size === allIds.length, allIds);
}

section("POST /api/itinerary/generate — error cases");
{
  const r1 = await req("POST", "/api/itinerary/generate", {});
  console.log(`  → HTTP ${r1.status}  body: ${JSON.stringify(r1.body)}`);
  assert("missing tripId → 400 MISSING_FIELDS", r1.status === 400 && r1.body.error?.code === "MISSING_FIELDS", r1.body);

  const r2 = await req("POST", "/api/itinerary/generate", { tripId: "does_not_exist" });
  console.log(`  → HTTP ${r2.status}  body: ${JSON.stringify(r2.body)}`);
  assert("unknown tripId → 404 TRIP_NOT_FOUND", r2.status === 404 && r2.body.error?.code === "TRIP_NOT_FOUND", r2.body);
}

section("GET /api/itinerary/:tripId — retrieve stored itinerary");
{
  const r = await req("GET", `/api/itinerary/${soloTripId}`);
  console.log(`  → HTTP ${r.status}`);
  assert("status 200",               r.status === 200,              r.status);
  assert("tripId matches",           r.body.tripId === soloTripId,  r.body.tripId);
  assert("days array present",       Array.isArray(r.body.days),    r.body.days);
  assert("GET matches POST exactly", JSON.stringify(r.body) === JSON.stringify(generatedBody), "mismatch");
}

section("GET /api/itinerary/:tripId — error cases");
{
  // unknown trip
  const r1 = await req("GET", "/api/itinerary/nonexistent");
  console.log(`  → HTTP ${r1.status}  body: ${JSON.stringify(r1.body)}`);
  assert("unknown id → 404 TRIP_NOT_FOUND", r1.status === 404 && r1.body.error?.code === "TRIP_NOT_FOUND", r1.body);

  // trip exists but generate never called
  const newTrip = await req("POST", "/api/trips", { destination: "Ladakh", days: 4, people: 2 });
  const r2 = await req("GET", `/api/itinerary/${newTrip.body.tripId}`);
  console.log(`  → HTTP ${r2.status}  body: ${JSON.stringify(r2.body)}`);
  assert("no itinerary yet → 404 ITINERARY_NOT_FOUND", r2.status === 404 && r2.body.error?.code === "ITINERARY_NOT_FOUND", r2.body);
}

// ─── summary ────────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(60)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log("═".repeat(60));
if (failed > 0) process.exit(1);
