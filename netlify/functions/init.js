// netlify/functions/init.js
import { neon } from '@netlify/neon';
const sql = neon();

const DDL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     text        NOT NULL,
  author      text        NOT NULL,
  body        text        NULL,
  file_url    text        NULL,
  parent_id   uuid        NULL REFERENCES messages(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  edited_at   timestamptz NULL,
  deleted_at  timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_room_time ON messages(room_id, created_at DESC);
`;

export default async () => {
  try {
    await sql.unsafe(DDL);
    return new Response('OK: schema ready', { status: 200 });
  } catch (e) {
    return new Response('ERR: ' + e.message, { status: 500 });
  }
};
