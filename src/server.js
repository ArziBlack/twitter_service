const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { TwitterApi } = require("twitter-api-v2");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/user", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/user.html"));
});

app.get("/tweets", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/tweets.html"));
});

// now using OAuth2.0
const twitterClient = new TwitterApi({
  clientId: process.env.Client_ID,
  clientSecret: process.env.Client_Secret,
});

app.get("/auth/twitter", async (req, res) => {
  try {
    const { url, codeVerifier, state } = await twitterClient.generateOAuth2AuthLink(
      process.env.TWITTER_CALLBACK_URL,
      { scope: ["tweet.read", "users.read", "offline.access"] }
    );

    console.log('Please go to', url);
    res.status(200).json({
      success: true,
      user: user.data,
    });

    console.log(user.data);
  } catch (error) {
    console.error("Error fetching user data:", error?.data?.title);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user data.",
      error: error?.data?.title,
    });
  }
});

app.get("/auth/callback", async (req, res) => {
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
