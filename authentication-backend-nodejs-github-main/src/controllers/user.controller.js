import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import {User} from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import {FOLDER} from '../utils/constants.js';
import {
    uploadFileOnCloudinary,
    deleteFileFromCloudinary,
} from '../utils/cloudinary.js';

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(
            500,
            `Something went wrong while generation access and refresh token's`
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validate data - not empty
    // check if user exist in db - username and email
    // check for images - avatar
    // uplaod image to cloudinary - check uploaded or not
    // extract url from the cloudinary upload response
    // create user object in db - instance creation
    // remove password and refresh token field from the user object
    // send response to frontend

    const {fullname, email, username, password} = req.body;

    if (
        [fullname, email, username, password].some(
            (field) => field?.trim === ''
        )
    ) {
        throw new ApiError(400, 'All fields are required');
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}],
    });

    if (existedUser) {
        throw new ApiError(
            409,
            'User with this username or email already exists'
        );
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is required');
    }

    // upload avatar to cloudinary
    const avatar = await uploadFileOnCloudinary(avatarLocalPath, FOLDER.USERS);

    if (!avatar) {
        throw new ApiError(400, 'Error while uploading avatar');
    }

    const user = await User.create({
        fullname,
        email,
        username,
        password,
        avatar: avatar.url,
    });

    const createdUser = await User.findById(user._id).select(
        '-password -refreshToken'
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            'Something went wrong while registering the user'
        );
    }

    return res
        .status(201)
        .json(new ApiResponse(201, createdUser, 'User created successfully'));
});

const loginUser = asyncHandler(async (req, res) => {
    // Take valid email/username and password
    // valid user in database and check password
    // Generate refresh token
    // store in db and return to user
    // also handle error in each step

    const {email, username, password} = req.body;

    if (!(username || email)) {
        throw new ApiError(400, 'Username or email is required');
    }

    const user = await User.findOne({
        $or: [{username}, {email}],
    });

    if (!user) {
        throw new ApiError(
            404,
            "User doesn't exists with given username or email"
        );
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid user credentials!');
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        '-password -refreshToken'
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: accessToken,
                    refreshToken,
                    loggedInUser,
                },
                'User loggedIn successfully'
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined,
        },
        new: true,
    });

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie('accessToken', options)
        .clearCookie('refreshToken', options)
        .json(new ApiResponse(200, {}, 'User loggedout succesfully'));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, 'Unauthorized request');
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, 'Invalid refresh token');
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, 'Refresh token is expired or Used');
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(
            user._id
        );

        return res
            .status(200)
            .cookie('accessToken', accessToken, options)
            .cookie('refreshToken', refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken,
                    },
                    'Token refreshed successfully'
                )
            );
    } catch (error) {
        throw new ApiError(400, error?.message || 'Invalid refresh token');
    }
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, 'User fetched successfully'));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {currentPassword, newPassword} = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(
            400,
            'Current password and new password is required'
        );
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const isPasswordValid = await user.isPasswordCorrect(currentPassword);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid current password');
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
        .status(200)
        .json(new ApiResponse(200, {}, 'Password changed successfully'));
});

const updateUser = asyncHandler(async (req, res) => {
    const {fullname, email, phone, bio} = req.body;

    // Check if at least one field is provided
    if (!fullname && !email && !phone && !bio) {
        throw new ApiError(
            400,
            'At least one field (fullname, email, phone, or bio) is required'
        );
    }

    // Prepare the fields to be updated
    const updateFields = {};
    if (fullname) updateFields.fullname = fullname;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (bio) updateFields.bio = bio;

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {$set: updateFields},
        {new: true}
    ).select('-password');

    return res
        .status(200)
        .json(new ApiResponse(200, user, 'User updated successfully'));
});

const updateUserAvatarImage = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is required');
    }

    const avatar = await uploadFileOnCloudinary(avatarLocalPath, FOLDER.USERS);

    if (!avatar) {
        throw new ApiError(400, 'Error while uploading avatar');
    }

    if (req.user.avatar) {
        await deleteFileFromCloudinary(FOLDER.USERS, req.user.avatar);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {new: true}
    ).select('-password');

    return res
        .status(200)
        .json(new ApiResponse(200, user, 'Avatar updated successfully'));
});

const viewAllUsers = asyncHandler(async (req, res) => {
    let users;
    if (req.user.isAdmin) {
        users = await User.find().select('-password -refreshToken');
    } else {
        users = await User.find({isPublic: true}).select(
            '-password -refreshToken'
        );
    }
    return res
        .status(200)
        .json(new ApiResponse(200, users, 'Users fetched successfully'));
});

const updateUserVisibility = asyncHandler(async (req, res) => {
    const {isPublic} = req.user;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                isPublic: !isPublic,
            },
        },
        {new: true}
    ).select('-password');

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                `User visibility updated to ${user.isPublic ? 'Public' : 'Private'}`
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUser,
    updateUserAvatarImage,
    viewAllUsers,
    updateUserVisibility,
};
