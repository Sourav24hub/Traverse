import http from "http";

function req(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "localhost", port: 5000, path, method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
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
    if (payload) r.write(payload);
    r.end();
  });
}

function pp(obj) { return JSON.stringify(obj, null, 2); }

(async () => {
  // ── STEP 1: Create a group trip (admin) ──────────────────────────────────
  console.log("=== STEP 1: POST /api/trips (create group trip as admin) ===");
  const createRes = await req("POST", "/api/trips", {
    type: "trip", mode: "group", destination: "Manali", days: 3, people: 4, userName: "Alice"
  });
  console.log(`HTTP ${createRes.status}`);
  console.log(pp(createRes.body));
  const { tripId, adminUserId, roomCode } = createRes.body;

  // ── STEP 2: Join with a second user ──────────────────────────────────────
  console.log("\n=== STEP 2: POST /api/trips/join (Priya joins) ===");
  const joinRes = await req("POST", "/api/trips/join", { roomCode, userName: "Priya" });
  console.log(`HTTP ${joinRes.status}`);
  console.log(pp(joinRes.body));
  const priyaId = joinRes.body.userId;

  // ── STEP 3: Join with a third user ───────────────────────────────────────
  console.log("\n=== STEP 3: POST /api/trips/join (Raj joins) ===");
  const joinRes2 = await req("POST", "/api/trips/join", { roomCode, userName: "Raj" });
  console.log(`HTTP ${joinRes2.status}`);
  console.log(pp(joinRes2.body));
  const rajId = joinRes2.body.userId;

  // ── STEP 4: GET members list ─────────────────────────────────────────────
  console.log("\n=== STEP 4: GET /api/trips/:tripId/members ===");
  const membersRes = await req("GET", `/api/trips/${tripId}/members`);
  console.log(`HTTP ${membersRes.status}`);
  console.log(pp(membersRes.body));

  // ── STEP 5: Admin removes Priya ──────────────────────────────────────────
  console.log("\n=== STEP 5: DELETE member Priya (by admin) ===");
  const delRes = await req("DELETE", `/api/trips/${tripId}/members/${priyaId}`, { adminUserId });
  console.log(`HTTP ${delRes.status}`);
  console.log(pp(delRes.body));

  // ── STEP 6: Confirm member list after removal ────────────────────────────
  console.log("\n=== STEP 6: GET members list (Priya should be gone) ===");
  const membersRes2 = await req("GET", `/api/trips/${tripId}/members`);
  console.log(`HTTP ${membersRes2.status}`);
  console.log(pp(membersRes2.body));

  // ── STEP 7: Non-admin (Raj) tries to remove admin → 403 ─────────────────
  console.log("\n=== STEP 7: DELETE admin by Raj (non-admin) → expect 403 ===");
  const failRes = await req("DELETE", `/api/trips/${tripId}/members/${adminUserId}`, { adminUserId: rajId });
  console.log(`HTTP ${failRes.status}`);
  console.log(pp(failRes.body));

  // ── STEP 8: Admin tries to remove themselves → 400 ───────────────────────
  console.log("\n=== STEP 8: DELETE admin by admin (self-remove) → expect 400 ===");
  const selfRes = await req("DELETE", `/api/trips/${tripId}/members/${adminUserId}`, { adminUserId });
  console.log(`HTTP ${selfRes.status}`);
  console.log(pp(selfRes.body));

  // ── STEP 9: Remove nonexistent member → 404 ─────────────────────────────
  console.log("\n=== STEP 9: DELETE nonexistent member → expect 404 ===");
  const ghostRes = await req("DELETE", `/api/trips/${tripId}/members/u_ghost`, { adminUserId });
  console.log(`HTTP ${ghostRes.status}`);
  console.log(pp(ghostRes.body));

})();
