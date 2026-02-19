import { NextResponse } from "next/server";
import { AppError, ValidationError } from "./errors";
import { ZodError, ZodIssue } from "zod";

export function successResponse<T>(data: T, statusCode: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  );
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          ...(error instanceof ValidationError && { errors: error.errors }),
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          errors: error.issues.map((err: ZodIssue) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  // Log detailed error information
  console.error("Unexpected error:", error);
  if (error instanceof Error) {
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
  }

  // In development, include error details in response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return NextResponse.json(
    {
      success: false,
      error: {
        message: isDevelopment && error instanceof Error 
          ? error.message 
          : "Internal server error",
        code: "INTERNAL_ERROR",
        ...(isDevelopment && error instanceof Error && {
          details: {
            name: error.name,
            stack: error.stack,
          },
        }),
      },
    },
    { status: 500 }
  );
}

