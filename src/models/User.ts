import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    // Student information
    mobileNumber: {
      type: String,
      trim: true,
      required: function (this: { role: string }) {
        return this.role === "student";
      },
      match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."],
    },

    city: {
      type: String,
      trim: true,
      required: function (this: { role: string }) {
        return this.role === "student";
      },
    },

    dateOfBirth: {
      type: Date,
      required: function (this: { role: string }) {
        return this.role === "student";
      },
      validate: {
        validator: (value: Date | undefined) => {
          if (!value) return true;
          return value < new Date();
        },
        message: "Date of birth must be in the past.",
      },
    },

    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },

    board: {
      type: String,
      enum: ["RBSE", "CBSE"],
    },

    classLevel: {
      type: String,
      enum: ["11", "12", "BCom", "CA_FOUNDATION"],
    },

    // Subjects assigned to a teacher by admin
    assignedSubjects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Index for teacher subject assignment queries
userSchema.index({ assignedSubjects: 1, role: 1 });

export default models.User || model("User", userSchema);
