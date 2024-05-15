import passport from 'passport';
import {Strategy as GithubStrategy} from 'passport-github2';
import {User} from '../models/user.model.js';

passport.use(
    new GithubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({githubId: profile.id});
                if (!user) {
                    user = await User.create({
                        githubId: profile.id,
                        username: profile.username,
                        email:
                            profile.emails && profile.emails.length > 0
                                ? profile.emails[0].value
                                : null,
                        avatar:
                            profile.photos && profile.photos.length > 0
                                ? profile.photos[0].value
                                : null,
                        fullname: profile.name || profile.username,
                    });
                }

                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export {passport};
