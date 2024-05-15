import {Router} from 'express';
const router = Router();

import {
    loginUser,
    logoutUser,
    registerUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUser,
    updateUserAvatarImage,
    viewAllUsers,
    updateUserVisibility,
} from '../controllers/user.controller.js';
import {upload} from '../middlewares/multer.middleware.js';
import {verifyJWT} from '../middlewares/auth.middleware.js';

import {passport} from '../utils/passportConfig.js';

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1,
        },
    ]),
    registerUser
);

router.route('/login').post(loginUser);

// Secret routes
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/change-password').post(verifyJWT, changeCurrentPassword);
router.route('/current-user').get(verifyJWT, getCurrentUser);
router.route('/update-account').patch(verifyJWT, updateUser);
router
    .route('/update-avatar')
    .patch(verifyJWT, upload.single('avatar'), updateUserAvatarImage);
router.route('/users').get(verifyJWT, viewAllUsers);
router.route('/update-visibility').patch(verifyJWT, updateUserVisibility);

router
    .route('/auth/github')
    .get(passport.authenticate('github', {scope: ['user:email']}));

router
    .route('/auth/github/callback')
    .get(
        passport.authenticate('github', {failureRedirect: '/'}),
        (req, res) => {
            res.redirect('/api/v1/users/login');
        }
    );

export default router;
