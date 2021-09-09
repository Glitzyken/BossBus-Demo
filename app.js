const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { google } = require("googleapis");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

const credentials = require("./credentials");

const app = express();

app.use(cors());
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

let arrOfEvents = [];

app.post("/", async (req, res) => {
  const tkn = req.body.token;

  const TOKEN_PATH = "token.json";

  authorize(credentials, listEvents);

  function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, async (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      await callback(oAuth2Client);
    });
  }

  async function getAccessToken(oAuth2Client, callback) {
    await oAuth2Client.getToken(tkn, async (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      await callback(oAuth2Client);
    });
  }

  function listEvents(auth) {
    const calendar = google.calendar({ version: "v3", auth });
    calendar.events.list(
      {
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      },
      (err, res) => {
        if (err) return console.log("The API returned an error: " + err);
        const events = res.data.items;
        if (events.length) {
          events.forEach((event, i) => {
            arrOfEvents.push(event);
          });
        } else {
          console.log("No upcoming events found.");
        }
      }
    );
  }

  res.status(200).json(arrOfEvents);
});

const port = 8000;

app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
