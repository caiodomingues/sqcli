#!/usr/bin/env node

const kleur = require("kleur");
const Table = require("cli-table3");
const prompts = require("prompts");

const questions = [
  {
    type: "text",
    name: "host",
    message: "Host:",
    initial: "127.0.0.1",
    validate: (value) => (value === " " ? "Host can't be empty" : true),
  },
  {
    type: "number",
    name: "port",
    message: "Port:",
    initial: 3306,
    validate: (value) => (value === " " ? "Port can't be empty" : true),
  },
  {
    type: "text",
    name: "database",
    message: "Database:",
    validate: (value) => (value === "" ? "Database can't be empty" : true),
  },
  {
    type: "text",
    name: "user",
    message: "Username:",
    initial: "root",
    validate: (value) => (value === " " ? "Username can't be empty" : true),
  },
  {
    type: "password",
    name: "password",
    message: "Password:",
  },
];

(async () => {
  console.log(kleur.cyan().bold("Press ESC to quit"));
  const { host, port, user, password, database } = await prompts(questions, {
    onCancel: () => {
      process.exit(1);
    },
  });

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
              validate: (value) =>
                value === " " ? "Reload frequency can't be empty" : true,
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
              console.log("Table length: ", res.length);
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
                console.log("Table length: ", res.length);
                console.log(display.toString());
              });
          }, frequency * 1000);
        });
    });
})();
