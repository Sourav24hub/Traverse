async function runTest() {
  console.log("Creating trip...");
  const tripRes = await fetch("http://localhost:5000/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "trip", mode: "solo", destination: "Delhi", days: 1, people: 1 })
  });
  const trip = await tripRes.json();
  const tripId = trip.tripId;

  console.log("Generating itinerary...");
  await fetch("http://localhost:5000/api/itinerary/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tripId })
  });

  console.log("Testing INVALID prompt...");
  const invalidRes = await fetch("http://localhost:5000/api/itinerary/replan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tripId, prompt: "what is the color of the sky?" })
  });
  const invalidData = await invalidRes.json();
  console.log("Invalid Res:", invalidData);
  if (invalidRes.status === 400 && invalidData.error.code === 'INVALID_REPLAN_PROMPT') {
      console.log("SUCCESS: Invalid prompt rejected correctly.");
  } else {
      console.log("FAIL: Invalid prompt not rejected.");
  }

  console.log("Testing VALID prompt...");
  const validRes = await fetch("http://localhost:5000/api/itinerary/replan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tripId, prompt: "I am hungry, give me more food options." })
  });
  const validData = await validRes.json();
  if (validRes.status === 200 && validData.updatedDays) {
      console.log("SUCCESS: Valid prompt succeeded.");
      console.log("Reason:", validData.reason);
  } else {
      console.log("FAIL: Valid prompt failed.", validData);
  }
}

runTest().catch(console.error);
