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
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS"
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
      const idParam = event.queryStringParameters?.id;
      if (idParam) {
        const id = parseInt(idParam, 10);
        if (isNaN(id)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid contract id parameter" }) };
        }
        const result = await sql("SELECT * FROM contracts WHERE id = $1", [id]);
        if (!result || result.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "Contract not found" }) };
        }
        // Parse JSONB field 'parties' if it returned as a string
        const contract = result[0];
        if (contract.parties && typeof contract.parties === "string") {
          try {
            contract.parties = JSON.parse(contract.parties);
          } catch {}
        }
        return { statusCode: 200, headers, body: JSON.stringify(contract) };
      } else {
        const result = await sql("SELECT * FROM contracts ORDER BY created_at DESC");
        // Parse 'parties' for each contract if needed
        const contracts = result.map(item => {
          if (item.parties && typeof item.parties === "string") {
            try {
              item.parties = JSON.parse(item.parties);
            } catch {}
          }
          return item;
        });
        return { statusCode: 200, headers, body: JSON.stringify(contracts) };
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
      const { title, content, status, parties } = data;
      if (!title || !content || !status) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Contract title, content, and status are required" }) };
      }
      const partiesJson = parties ? JSON.stringify(parties) : JSON.stringify([]);
      const result = await sql(
        "INSERT INTO contracts(title, content, status, parties) VALUES ($1, $2, $3, $4) RETURNING *",
        [title, content, status, partiesJson]
      );
      const newContract = result[0] || {};
      // Parse parties if it returned as string
      if (newContract.parties && typeof newContract.parties === "string") {
        try {
          newContract.parties = JSON.parse(newContract.parties);
        } catch {}
      }
      return { statusCode: 200, headers, body: JSON.stringify(newContract) };
    }

    else if (event.httpMethod === "PATCH") {
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
      // Determine contract ID to update
      const idParam = event.queryStringParameters?.id;
      const contractId = idParam ? parseInt(idParam, 10) : parseInt(data.id, 10);
      if (!contractId || isNaN(contractId)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Contract id is required for update" }) };
      }
      // Build dynamic UPDATE query based on provided fields
      const fields = [];
      const values = [];
      let idx = 1;
      if (data.title) {
        fields.push(title = $${idx++});
        values.push(data.title);
      }
      if (data.content) {
        fields.push(content = $${idx++});
        values.push(data.content);
      }
      if (data.status) {
        fields.push(status = $${idx++});
        values.push(data.status);
      }
      if (data.parties) {
        fields.push(parties = $${idx++}::jsonb);
        values.push(JSON.stringify(data.parties));
      }
      // Always update the updated_at timestamp to current time
      fields.push(updated_at = NOW());
      // Finalize query string
      const query = UPDATE contracts SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *;
      values.push(contractId);
      const result = await sql(query, values);
      if (!result || result.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Contract not found" }) };
      }
      const updatedContract = result[0];
      if (updatedContract.parties && typeof updatedContract.parties === "string") {
        try {
          updatedContract.parties = JSON.parse(updatedContract.parties);
        } catch {}
      }
      return { statusCode: 200, headers, body: JSON.stringify(updatedContract) };
    }

    else {
      return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
    }
  } catch (error) {
    console.error("Error in contracts function:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
