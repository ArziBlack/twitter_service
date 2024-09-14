const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { TwitterApi } = require("twitter-api-v2");
const asyncWrapOrError = require("./util");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../public")));

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY,
  appSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});


const callbackUrl = process.env.TWITTER_CALLBACK_URL;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Redirect to twitter for authentication
app.get(
  "/auth/twitter",
  asyncWrapOrError(async (req, res) => {
    try {
      const { url, oauth_token, oauth_token_secret } =
        await twitterClient.generateAuthLink(callbackUrl);
      console.log(callbackUrl);

      // Store oauth_token_secret temporarily (in production, use a more secure method)
      req.session = { oauth_token_secret };

      res.json({
        success: true,
        authUrl: url,
      });
    } catch (error) {
      console.error("Error generating Twitter auth link:", error);
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to authenticate with Twitter.",
        });
    }
  })
);

app.get("/auth/callback", async (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;
  const { oauth_token_secret } = req.session;

  if (!oauth_token || !oauth_verifier) {
    return res
      .status(400)
      .json({ success: false, error: "Missing oauth_token or oauth_verifier" });
  }

  try {
    // Complete the OAuth process
    const {
      client: loggedClient,
      accessToken,
      accessSecret,
    } = await twitterClient.login(
      oauth_token,
      oauth_token_secret,
      oauth_verifier
    );

    const user = await loggedClient.v2.me();

    res.json({
      success: true,
      message: "Successfully authenticated with Twitter!",
      data: {
        accessToken,
        accessSecret,
        user,
      },
    });
    console.log(user);
  } catch (error) {
    console.error("Error during Twitter callback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete Twitter authentication.",
    });
  }
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
