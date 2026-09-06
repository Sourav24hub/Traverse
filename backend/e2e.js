async function runTest() {
  console.log("Creating trip...");
  const tripRes = await fetch("http://localhost:5000/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "trip",
      mode: "solo",
      destination: "Delhi",
      days: 2,
      people: 2,
    })
  });
  const trip = await tripRes.json();
  console.log("Trip ID:", trip.tripId);

  console.log("Generating itinerary...");
  const itinRes = await fetch("http://localhost:5000/api/itinerary/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tripId: trip.tripId })
  });
  const itinerary = await itinRes.json();
  const firstItem = itinerary.days[0].items[0];
  console.log("First item:", firstItem.name, "Completed?", firstItem.completed);

  console.log("Simulating reaching first item...");
  const locRes = await fetch("http://localhost:5000/api/location/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tripId: trip.tripId,
      userId: "test-user",
      lat: firstItem.lat,
      lng: firstItem.lng,
      timestamp: new Date().toISOString()
    })
  });
  const locData = await locRes.json();
  console.log("Reached item IDs:", locData.reached);

  console.log("Replanning...");
  const replanRes = await fetch("http://localhost:5000/api/itinerary/replan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tripId: trip.tripId,
      trigger: "delay",
      details: "Running 2 hours late"
    })
  });
  const replanData = await replanRes.json();
  
  const updatedFirstItem = replanData.updatedDays[0].items[0];
  console.log("Replanned Reason:", replanData.reason);
  console.log("First item after replan:", updatedFirstItem.name, "Completed?", updatedFirstItem.completed);
  
  if (updatedFirstItem.itemId === firstItem.itemId && updatedFirstItem.completed === true) {
      console.log("SUCCESS: Completed item was preserved!");
  } else {
      console.log("FAIL: Completed item was modified or removed.");
  }
}

runTest().catch(console.error);
