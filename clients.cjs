const { neon } = require("@neondatabase/serverless");
require("dotenv").config();  // Load .env in local development

const databaseUrl = process.env.NETLIFY_DATABASE_URL;
if (!databaseUrl) {
  console.error("NETLIFY_DATABASE_URL environment variable is not defined.");
}
const sql = databaseUrl ? neon(databaseUrl) : null;

exports.handler = async function(event, context) {
  // CORS headers for all responses
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  // Handle preflight OPTIONS request
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
      const idParam = event.queryStringParameters?.id;
      if (idParam) {
        const id = parseInt(idParam, 10);
        if (isNaN(id)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid client id parameter" }) };
        }
        const result = await sql("SELECT * FROM clients WHERE id = $1", [id]);
        if (!result || result.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "Client not found" }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
      } else {
        const result = await sql("SELECT * FROM clients ORDER BY created_at DESC");
        return { statusCode: 200, headers, body: JSON.stringify(result) };
      }
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
      const { name } = data;
      if (!name || typeof name !== "string") {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Client name is required" }) };
      }
      // Insert new client (id and created_at will be set by the database)
      const result = await sql("INSERT INTO clients(name) VALUES($1) RETURNING *", [name]);
      const newClient = result[0] || {};
      return { statusCode: 200, headers, body: JSON.stringify(newClient) };
    }

    else {
      // Method not allowed
      return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
    }
  } catch (error) {
    console.error("Error in clients function:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
