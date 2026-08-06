const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("./db");

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                const name = profile.displayName;

                let result = await pool.query(
                    "SELECT * FROM users WHERE email = $1",
                    [email]
                );

                let user;

                if (result.rows.length === 0) {
                    result = await pool.query(
                        `INSERT INTO users
                        (name, email,password_hash,role, provider)
                        VALUES ($1, $2,NULL, 'user', 'google')
                        RETURNING *`,
                        [name, email]
                    );

                    user = result.rows[0];
                } else {
                    user = result.rows[0];
                }

                return done(null, user);

            } catch (err) {
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const result = await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [id]
    );

    done(null, result.rows[0]);
});