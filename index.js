#!/usr/bin/env node

const Table = require("cli-table3");
const prompts = require("prompts");

const questions = [
  {
    type: "text",
    name: "host",
    message: "Host:",
    initial: "127.0.0.1",
  },
  {
    type: "number",
    name: "port",
    message: "Port:",
    initial: 3306,
  },
  {
    type: "text",
    name: "database",
    message: "Database:",
  },
  {
    type: "text",
    name: "user",
    message: "Username:",
    initial: "root",
  },
  {
    type: "password",
    name: "password",
    message: "Password:",
  },
];

(async () => {
  const { host, port, user, password, database } = await prompts(questions);

  const knex = require("knex")({
    client: "mysql",
    connection: {
      host,
      port,
      user,
      password,
      database,
    },
  });

  knex("information_schema.tables")
    .select("*")
    .where("table_schema", database)
    .then(async (res) => {
      let tableChoices = [];

      res.forEach((table) => {
        let tmp = Object.values(table)[2];
        tableChoices.push({ title: tmp, value: tmp });
      });

      const { table } = await prompts([
        {
          type: "select",
          name: "table",
          message: "Table:",
          choices: tableChoices,
          initial: 0,
        },
      ]);

      knex(table)
        .columnInfo()
        .then(async (info) => {
          let columnChoices = [];

          Object.keys(info).forEach((i) => {
            columnChoices.push({ name: i, value: i });
          });

          const { columns, frequency } = await prompts([
            {
              type: "multiselect",
              name: "columns",
              message: "Columns:",
              choices: columnChoices,
              hint: "- Space to select. Return to submit",
            },
            {
              type: "number",
              name: "frequency",
              message: "Reload frequency (in seconds):",
              initial: 5,
            },
          ]);

          const display = new Table({
            head: [...columns],
          });

          knex(table)
            .select(columns)
            .then((res) => {
              res.forEach((line) => {
                let values = Object.values(line);
                display.push(values);
              });

              console.clear();
              console.log("Table: ", table);
              console.log(display.toString());
            });

          setInterval(() => {
            console.clear();
            display.length = 0;
            knex(table)
              .select(columns)
              .then((res) => {
                res.forEach((line) => {
                  let values = Object.values(line);
                  display.push(values);
                });

                console.log("Table: ", table);
                console.log(display.toString());
              });
          }, frequency * 1000);
        });
    });
})();
