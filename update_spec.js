const fs = require('fs');
let content = fs.readFileSync('PROJECT_SPEC.md', 'utf-8');

const replacement = `// Request
{
  "tripId": "abc123",
  "prompt": "It's raining heavily near the temple, we need indoor activities."
}

// Success Response
{
  "tripId": "abc123",
  "updatedDays": [ /* same shape as itinerary days, remaining items only */ ],
  "reason": "Outdoor activity replaced due to rain."
}

// Error Response (Invalid or irrelevant prompt)
{
  "error": {
    "code": "INVALID_REPLAN_PROMPT",
    "message": "We couldn't understand that as a valid trip change request."
  }
}
\`\`\``;

// Normalize to LF for easy matching
content = content.replace(/\r\n/g, '\n');

const regex = /\/\/ Request\n\{\n\s*"tripId": "abc123",\n\s*"trigger": "weather",[\s\S]*?"reason": "Outdoor activity replaced due to rain\."\n\}\n```/m;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('PROJECT_SPEC.md', content);
    console.log('Successfully updated PROJECT_SPEC.md');
} else {
    console.log('Could not find block with regex');
}
