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

const callbackUrl = process.env.TWITTER_CALLBACK_URL;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const TOKENS = {
  appKey: process.env.TWITTER_CONSUMER_KEY,
  appSecret: process.env.TWITTER_CONSUMER_SECRET,
};

// This clientId works for OAuth2 only, using url, codeVerifier, state
// clientId: process.env.TWITTER_CLIENT_ID,

// now using OAuth1.0
const twitterClient = new TwitterApi({
    ...TOKENS
});

// Redirect to twitter for authentication
app.get(
  "/auth/twitter",
  asyncWrapOrError(async (req, res) => {
    try {
      const { url, codeVerifier, state, oauth_token, oauth_token_secret } =
        await twitterClient.generateAuthLink(callbackUrl);

      console.log("starting req.session...");
      console.log("URL Returned: ", url);
      console.log("callbackUrl Returned: ", callbackUrl);
      console.log("State Returned: ", state);
      console.log("Code Verifier Returned: ", codeVerifier);
      console.log("oauth_token Verifier Returned: ", oauth_token);
      console.log("oauth_token_secret Verifier Returned: ", oauth_token_secret);

      req.session.codeVerifier = codeVerifier;
      req.session.state = state;
      req.session.oauthToken = oauth_token;
      req.session.oauthSecret = oauth_token_secret;

      res.json({
        success: true,
        authUrl: url,
      });
      console.log(url);
    } catch (error) {
      console.error("Error generating Twitter auth link:", error);
      res.status(500).json({
        success: false,
        error: "Failed to authenticate with Twitter.",
      });
    }
  })
);

app.get(
  "/auth/callback",
  asyncWrapOrError(async (req, res) => {
    const { state, code } = req.query;
    const storedState = req.session.state;
    const codeVerifier = req.session.codeVerifier;
    const token = req.query.oauth_token;
    const verifier = req.query.oauth_verifier;
    const savedToken = req.session.oauthToken;
    const savedSecret = req.session.oauthSecret;

    console.log("state: ", state);
    console.log("code: ", code);
    console.log("storedState: ", storedState);
    console.log("codeVerifier: ", codeVerifier);
    console.log("token: ", token);
    console.log("verifier: ", verifier);
    console.log("savedToken: ", savedToken);
    console.log("savedSecret: ", savedSecret);

    try {
      if (!savedToken || !savedSecret || savedToken !== token) {
        res.status(400).render("error", {
          error:
            "OAuth token is not known or invalid. Your request may have expire. Please renew the auth process.",
        });
        return;
      }

      // Build a temporary client to get access token
      const tempClient = new TwitterApi({
        ...TOKENS,
        accessToken: token,
        accessSecret: savedSecret,
      });

      // Ask for definitive access token
      const { accessToken, accessSecret, screenName, userId } =
        await tempClient.login(verifier);
      // You can store & use accessToken + accessSecret to create a new client and make API calls!

    //   res.render("callback", { accessToken, accessSecret, screenName, userId });
        res.json({
          success: true,
        //   authUrl: url,
          userId,
          accessSecret,
          accessToken,
          screenName
        });

      // Check if the state matches
      //   if (!state || storedState !== state) {
      //     return res.status(400).json({ error: "State mismatch or missing" });
      //   }

      // Exchange the authorization code for an access token
      // const {
      //   client: loggedClient,
      // //   accessToken,
      //   refreshToken,
      //   expiresIn,
      // } = await twitterClient.loginWithOAuth2({
      //   code,
      //   codeVerifier,
      //   redirectUri: callbackUrl,
      // });

      // const user = await loggedClient.currentUser();

      // res.json({
      //   message: "OAuth login successful!",
      // //   user: user,
      //   credentials: {
      //     accessToken,
      //     refreshToken,
      //     expiresIn,
      //   },
      // });
    //   console.log(user);
    } catch (error) {
      console.error("Error during Twitter callback:", error);
      res.status(500).json({
        success: false,
        error: "Failed to complete Twitter authentication.",
      });
    }
  })
);

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
