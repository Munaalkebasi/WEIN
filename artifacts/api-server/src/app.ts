import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createRouter } from "./routes";
import type { PlansDatabase } from "./routes/plans";
import { logger } from "./lib/logger";
import { ApiError } from "./lib/api-error";

export function createApp(database: PlansDatabase): Express {
  const app: Express = express();

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", createRouter(database));

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof ApiError) {
        return response.status(error.statusCode).json({
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        });
      }
      if (
        error instanceof SyntaxError &&
        (error as SyntaxError & { status?: number }).status === 400
      ) {
        return response
          .status(400)
          .json({
            code: "VALIDATION_ERROR",
            message: "Request body must be valid JSON",
          });
      }
      logger.error({ err: error }, "Unhandled API error");
      return response.status(500).json({
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      });
    },
  );

  return app;
}
