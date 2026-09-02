import http from "http";

const BASE = "http://localhost:5000";

function req(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost",
      port: 5000,
      path,
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

(async () => {
  try {
    console.log("=== STEP 1: POST /api/trips ===");
    const tripRes = await req("POST", "/api/trips", {
      type: "trip", mode: "solo", destination: "Vaishno Devi", days: 1, people: 2, prompt: "vegetarian only"
    });
    console.log(`HTTP ${tripRes.status}`);
    console.log(JSON.stringify(tripRes.body, null, 2));
    const tripId = tripRes.body.tripId;

    console.log("\n=== STEP 2: POST /api/itinerary/generate ===");
    let itinRes;
    for (let i = 1; i <= 3; i++) {
      itinRes = await req("POST", "/api/itinerary/generate", { tripId });
      console.log(`Attempt ${i}: HTTP ${itinRes.status}`);
      if (itinRes.status === 200) break;
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log(JSON.stringify(itinRes.body, null, 2));
    
    // Pick the first item from the generated itinerary
    const firstItem = itinRes.body.days[0].items[0];
    console.log(`\nSelected target item: ${firstItem.name} (${firstItem.lat}, ${firstItem.lng})`);

    console.log("\n=== STEP 3: POST /api/location/update (FAR AWAY) ===");
    const farRes = await req("POST", "/api/location/update", {
      tripId,
      userId: "u_test",
      lat: 0.0,
      lng: 0.0,
      timestamp: new Date().toISOString()
    });
    console.log(`HTTP ${farRes.status}`);
    console.log(JSON.stringify(farRes.body, null, 2));

    console.log("\n=== STEP 4: POST /api/location/update (EXACT MATCH) ===");
    const matchRes = await req("POST", "/api/location/update", {
      tripId,
      userId: "u_test",
      // Add a tiny offset (~10m) to simulate real GPS
      lat: firstItem.lat + 0.0001,
      lng: firstItem.lng + 0.0001,
      timestamp: new Date().toISOString()
    });
    console.log(`HTTP ${matchRes.status}`);
    console.log(JSON.stringify(matchRes.body, null, 2));

    console.log("\n=== STEP 5: GET /api/location/:tripId ===");
    const getRes = await req("GET", `/api/location/${tripId}`);
    console.log(`HTTP ${getRes.status}`);
    console.log(JSON.stringify(getRes.body, null, 2));

  } catch (err) {
    console.error(err);
  }
})();
