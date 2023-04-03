#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');
const pg = require('pg');
const mssql = require('mssql');

// CONFIG DIR: /home/username/.config/tengu/.active
const config_dir = path.resolve(os.homedir(), '.config', 'tengu', '.active');

let config = {};

try {
  config = JSON.parse(fs.readFileSync(config_dir, 'utf8'));
} catch (e) {
  console.log('No config file found');
}


async function main() {
  // read all from stdin
  const sql = fs.readFileSync(0, 'utf8');
  switch (config.engine) {
    case 'sqlserver':
      const sqlConfig = {
        user: config.username,
        password: config.password,
        database: config.database,
        server: config.host,
        port: Number(config.port),
        pool: {
          max: 1,
          min: 0,
          idleTimeoutMillis: 30000
        },
        options: {
          encrypt: false, // for azure
          trustServerCertificate: false // change to true for local dev / self-signed certs
        }
      }
      const pool = await mssql.connect(sqlConfig);
      const result = await pool.query(sql);
      console.table(result.recordset);
      process.exit(0);
    case 'postgres':
      const client = new pg.Client({
        user: config.username,
        host: config.host,
        database: config.database,
        password: config.password,
        port: Number(config.port),
      });
      await client.connect();
      const data = await client.query(sql)
      console.table(data.rows);
      process.exit(0);

    default:
      console.log('Unsupported engine');
  }
}
main();
