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
    const { url, codeVerifier, state } =
      await twitterClient.generateOAuth2AuthLink(
        process.env.TWITTER_CALLBACK_URL,
        { scope: ["tweet.read", "users.read", "offline.access"] }
      );

    console.log("Please go to", url);

    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    res.redirect(url);
    // res.status(200).json({
    //   success: true,
    //   message:
    //     "Successfully generated url, codeVerifier and state codes..., you can proceed to use them in your callback URL",
    //   codes: { codeVerifier, state },
    // });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user data.",
      error: error,
    });
  }
});

app.get("/auth/callback", async (req, res) => {
  const { state, code } = req.query;
  const { state: storedState, codeVerifier } = req.session;
  try {
    if (!state && !code) {
      res.status(400).json({
        success: false,
        data: "state and code not found in params!",
      });
      return;
    }

    if (state !== storedState) {
      return res.status(400).json({
        success: false,
        message: "State mismatch. Potential CSRF detected.",
      });
    }

    const { client, accessToken, refreshToken } =
      await twitterClient.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: process.env.TWITTER_CALLBACK_URL,
      });

    const user = await client.v2.me();
    console.log(user);

    res.redirect(
      `/success?refreshToken=${refreshToken}&accessToken=${accessToken}&screenName=${user?.username}`
    );
  } catch (error) {
    console.error("Error during OAuth2 callback:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete Twitter authentication.",
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
