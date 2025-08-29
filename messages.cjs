const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

const databaseUrl = process.env.NETLIFY_DATABASE_URL;
if (!databaseUrl) {
  console.error("NETLIFY_DATABASE_URL environment variable is not defined.");
}
const sql = databaseUrl ? neon(databaseUrl) : null;

exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  try {
    if (event.httpMethod === "GET") {
      if (!sql) {
        throw new Error("Database connection not configured.");
      }
      const roomIdParam = event.queryStringParameters?.room_id;
      if (!roomIdParam) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "room_id query parameter is required" }) };
      }
      const roomId = parseInt(roomIdParam, 10);
      if (isNaN(roomId)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid room_id parameter" }) };
      }
      // Fetch latest 200 messages for the room, then sort oldest-first
      const result = await sql(
        "SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 200",
        [roomId]
      );
      const messages = (result || []).reverse();  // reverse to chronological order (oldest first)
      return { statusCode: 200, headers, body: JSON.stringify(messages) };
    }

    else if (event.httpMethod === "POST") {
      if (!sql) {
        throw new Error("Database connection not configured.");
      }
      if (!event.body) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "No input data provided" }) };
      }
      let data;
      try {
        data = JSON.parse(event.body);
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Malformed JSON in request body" }) };
      }
      const { room_id, author, body: text, file_url, parent_id } = data;
      if (!room_id || !author || !text) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "room_id, author, and message body are required" }) };
      }
      const roomId = parseInt(room_id, 10);
      const parentId = parent_id ? parseInt(parent_id, 10) : null;
      if (isNaN(roomId)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid room_id" }) };
      }
      // Insert new message (id and created_at set by DB)
      const result = await sql(
        "INSERT INTO messages(room_id, author, body, file_url, parent_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [roomId, author, text, file_url || null, parentId]
      );
      const newMessage = result[0] || {};
      return { statusCode: 200, headers, body: JSON.stringify(newMessage) };
    }

    else {
      return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
    }
  } catch (error) {
    console.error("Error in messages function:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
