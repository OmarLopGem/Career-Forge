import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/app/models/User";

export async function GET() {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({
      email: "admin@careerforge.com",
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: "Admin user already exists",
        admin: {
          email: existingAdmin.email,
          role: existingAdmin.role,
          status: existingAdmin.status,
        },
      });
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    const adminUser = await User.create({
      firstName: "Career",
      lastName: "Forge Admin",
      email: "admin@careerforge.com",
      password: hashedPassword,
      role: "admin",
      status: "active",
    });

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      admin: {
        id: adminUser._id,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
        role: adminUser.role,
        status: adminUser.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}