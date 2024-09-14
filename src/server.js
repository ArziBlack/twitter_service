const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { TwitterApi } = require("twitter-api-v2");
const asyncWrapOrError = require("./util");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../public")));

const callbackUrl = process.env.TWITTER_CALLBACK_URL;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Redirect to twitter for authentication
app.get(
  "/auth/twitter",
  asyncWrapOrError(async (req, res) => {
    try {
      const twitterClient = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
      });
      const { url, codeVerifier, state } =
        await twitterClient.generateOAuth2AuthLink(callbackUrl, {
          scope: ["tweet.read", "users.read"],
        });

      req.session = { codeVerifier, state };

      res.json({
        success: true,
        authUrl: url,
      });
      console.log(url);
      console.log(state);
    } catch (error) {
      console.error("Error generating Twitter auth link:", error);
      res.status(500).json({
        success: false,
        error: "Failed to authenticate with Twitter.",
      });
    }
  })
);

app.get("/auth/callback", async (req, res) => {
  const { state, code } = req.query;
  const { state: storedState, codeVerifier } = req.session;

  // Check if the state matches
  if (!state || storedState !== state) {
    return res.status(400).json({ error: "State mismatch or missing" });
  }

  // Exchange the authorization code for an access token
  try {
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await twitterClient.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: callbackUrl,
    });

    const user = await loggedClient.currentUser();

    res.json({
      message: "OAuth login successful!",
      user: user,
      credentials: {
        accessToken,
        refreshToken,
        expiresIn,
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
