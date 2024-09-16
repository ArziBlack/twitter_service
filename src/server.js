const express = require("express");
const session = require("express-session");
const path = require("path");
const dotenv = require("dotenv");
const { TwitterApi } = require("twitter-api-v2");
const asyncWrapOrError = require("./util");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  session({
    secret: "my_personnal_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// now using OAuth2.0
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

app.get("/api/user/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const user = await twitterClient.v2.userByUsername(username);

    res.json({
      success: true,
      user: user.data,
    });

    console.log(user.data);
    console.log(tweets.data);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user data.",
    });
  }
});

app.get("/api/tweets/:username", async (req, res) => {
  const username = req.params.username;

  try {
    if (!username) {
      res.status(400).json({
        success: false,
        data: "username not found in request",
      });
      return;
    }

    const user = await twitterClient.v2.userByUsername(username);
    const tweets = await twitterClient.v2.userTimeline(user.data.id, {
      max_results: 5,
    });
    res.json({
      success: true,
      tweets: tweets.data,
    });
  } catch (error) {
    console.error("Error fetching Tweets:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tweets...",
    });
  }
});

app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/success.html"));
});

app.get("/api/data", (req, res) => {
  res.json({
    message: "Hello, World!",
    success: true,
    data: {
      id: 1,
      name: "Static server",
      description: "This is a sample JSON response...",
    },
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
