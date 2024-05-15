import {Schema, model} from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema(
    {
        username: {
            type: String,
            unique: [true, 'Username already exists'],
            required: [true, 'Username is required'],
            index: true,
            trim: true,
            lowercase: true,
        },
        email: {
            type: String,
            unique: [true, 'email already exists'],
            // required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
        },
        phoneNumber: {
            type: String,
            unique: [true, 'phone number already exists'],
            trim: true,
        },
        fullname: {
            type: String,
            required: [true, 'fullname is required'],
            trim: true,
        },
        bio: {
            type: String,
            trim: true,
        },
        password: {
            type: String,
            // required: [true, 'password is required'],
            trim: true,
        },
        refreshToken: {
            type: String,
        },
        avatar: {
            type: String,
            required: [true, 'avatar is required'],
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        githubId: {
            type: String,
            unique: true,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    return next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullname: this.fullname,
            avatar: this.avatar,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const User = model('User', userSchema);
