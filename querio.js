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
  // get first arg
  let params;
  const sql_console_file = process.argv[2];
  if (sql_console_file) {
    // remove .sql from sql_console_file
    const params_file = sql_console_file.replace(/\.sql$/, '.json');
    try {
      params = JSON.parse(fs.readFileSync(params_file, 'utf8'));
    } catch (e) {
    }
  }
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
      const request = pool.request();
      if (params) {
        Object.keys(params).forEach(key => {
          request.input(key, params[key]);
        });
      }
      const result = await request.query(sql);
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
      const data = await client.query(sql, params)
      console.table(data.rows);
      process.exit(0);

    default:
      console.log('Unsupported engine');
  }
}
main();
